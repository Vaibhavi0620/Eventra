/// EVENTRA — Sui Move Smart Contract for Anti-Scalping NFT Ticketing
///
/// Enforces on-chain:
/// 1. Unique NFT Ticket objects with immutable `original_price` and `max_resale_price` (in integer units).
/// 2. Strict anti-scalping resale cap (`proposed_price <= ticket.max_resale_price`).
///    Even if a user bypasses the EVENTRA website and invokes the contract directly via RPC/CLI,
///    any resale above `max_resale_price` aborts with `EResalePriceExceedsCap`.
/// 3. Authorized one-time venue entry (`verify_and_mark_used`), requiring an `EventRegistry`
///    and `VerifierCap`, matching `event_id`, and atomically flipping `is_used = true`.
/// 4. Rejection of any transfer, resale, or duplicate entry once a ticket is marked used.
module eventra::ticket_nft {
    use std::string::String;
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::sui::SUI;

    // -------------------------------------------------------------------------
    // Error Codes
    // -------------------------------------------------------------------------
    const ENotTicketOwner: u64 = 100;
    const EResalePriceExceedsCap: u64 = 101;
    const EInsufficientPayment: u64 = 102;
    const ETicketAlreadyUsed: u64 = 103;
    const EInvalidEventAssociation: u64 = 104;
    const EUnauthorizedVerifier: u64 = 105;
    const ESoldOut: u64 = 106;
    const EInvalidResaleCapConfig: u64 = 107;

    // -------------------------------------------------------------------------
    // On-Chain Objects
    // -------------------------------------------------------------------------

    /// Capability granted to an Event Organizer or Authorized Gate Verifier
    public struct VerifierCap has key, store {
        id: UID,
        event_id: ID,
        organizer: address,
    }

    /// Shared Event Registry object tracking supply, pricing, and authorized verifier
    public struct EventRegistry has key {
        id: UID,
        name: String,
        organizer: address,
        original_price: u64,
        max_resale_price: u64,
        total_supply: u64,
        minted_count: u64,
    }

    /// Unique NFT Ticket object owned by the attendee (`key` only, no public `store`
    /// so transfers MUST pass through module rules rather than unrestricted `public_transfer`)
    public struct TicketNFT has key {
        id: UID,
        ticket_serial: u64,
        event_id: ID,
        event_name: String,
        seat_label: String,
        current_owner: address,
        original_price: u64,
        max_resale_price: u64,
        is_used: bool,
        transfer_count: u64,
        resale_count: u64,
    }

    /// Shared escrow listing enforcing on-chain maximum resale price
    public struct ResaleEscrow has key {
        id: UID,
        ticket: TicketNFT,
        seller: address,
        asking_price: u64,
    }

    // -------------------------------------------------------------------------
    // On-Chain Telemetry Events
    // -------------------------------------------------------------------------
    public struct EventCreated has copy, drop {
        event_id: ID,
        organizer: address,
        original_price: u64,
        max_resale_price: u64,
        total_supply: u64,
    }

    public struct TicketMinted has copy, drop {
        ticket_id: ID,
        event_id: ID,
        owner: address,
        original_price: u64,
        max_resale_price: u64,
    }

    public struct TicketTransferred has copy, drop {
        ticket_id: ID,
        from: address,
        to: address,
        transfer_count: u64,
    }

    public struct TicketResold has copy, drop {
        ticket_id: ID,
        seller: address,
        buyer: address,
        sale_price: u64,
        max_resale_price: u64,
    }

    public struct TicketUsed has copy, drop {
        ticket_id: ID,
        event_id: ID,
        attendee: address,
        verifier: address,
    }

    // -------------------------------------------------------------------------
    // Core Entry & Public Functions
    // -------------------------------------------------------------------------

    /// Creates a new EventRegistry (shared object) and issues a VerifierCap to the organizer.
    /// Rounding policy for percentage-based caps: integer floor division is used by callers,
    /// and `max_resale_price >= original_price` is strictly enforced on-chain.
    public fun create_event(
        name: String,
        original_price: u64,
        max_resale_price: u64,
        total_supply: u64,
        ctx: &mut TxContext
    ): VerifierCap {
        assert!(max_resale_price >= original_price, EInvalidResaleCapConfig);
        let organizer = ctx.sender();
        let registry_uid = object::new(ctx);
        let event_id = object::uid_to_inner(&registry_uid);

        let registry = EventRegistry {
            id: registry_uid,
            name,
            organizer,
            original_price,
            max_resale_price,
            total_supply,
            minted_count: 0,
        };

        event::emit(EventCreated {
            event_id,
            organizer,
            original_price,
            max_resale_price,
            total_supply,
        });

        transfer::share_object(registry);

        VerifierCap {
            id: object::new(ctx),
            event_id,
            organizer,
        }
    }

    /// Mints a unique TicketNFT for `recipient` and records initial ownership and price cap.
    public fun mint_ticket(
        registry: &mut EventRegistry,
        seat_label: String,
        recipient: address,
        ctx: &mut TxContext
    ): TicketNFT {
        assert!(registry.minted_count < registry.total_supply, ESoldOut);
        registry.minted_count = registry.minted_count + 1;

        let ticket_uid = object::new(ctx);
        let ticket_id = object::uid_to_inner(&ticket_uid);
        let event_id = object::uid_to_inner(&registry.id);

        let ticket = TicketNFT {
            id: ticket_uid,
            ticket_serial: registry.minted_count,
            event_id,
            event_name: registry.name,
            seat_label,
            current_owner: recipient,
            original_price: registry.original_price,
            max_resale_price: registry.max_resale_price,
            is_used: false,
            transfer_count: 0,
            resale_count: 0,
        };

        event::emit(TicketMinted {
            ticket_id,
            event_id,
            owner: recipient,
            original_price: registry.original_price,
            max_resale_price: registry.max_resale_price,
        });

        ticket
    }

    /// Convenience entry wrapper to mint and deliver a TicketNFT directly to `recipient`.
    public entry fun mint_and_deliver(
        registry: &mut EventRegistry,
        seat_label: String,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let ticket = mint_ticket(registry, seat_label, recipient, ctx);
        transfer::transfer(ticket, recipient);
    }

    /// Controlled peer-to-peer transfer. Rejects if caller is not `current_owner` or if ticket is used.
    public entry fun transfer_ticket(
        mut ticket: TicketNFT,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        assert!(ticket.current_owner == sender, ENotTicketOwner);
        assert!(!ticket.is_used, ETicketAlreadyUsed);

        ticket.current_owner = recipient;
        ticket.transfer_count = ticket.transfer_count + 1;

        event::emit(TicketTransferred {
            ticket_id: object::uid_to_inner(&ticket.id),
            from: sender,
            to: recipient,
            transfer_count: ticket.transfer_count,
        });

        transfer::transfer(ticket, recipient);
    }

    /// Direct atomic resale enforcing `asking_price <= ticket.max_resale_price`.
    /// For example:
    ///   Original price = 1,000 units, Maximum resale price = 1,200 units.
    ///   - Resale at 1,100 units: ALLOWED
    ///   - Resale at 1,200 units: ALLOWED
    ///   - Resale at 1,500 units: REJECTED (`EResalePriceExceedsCap`)
    public entry fun execute_resale(
        mut ticket: TicketNFT,
        asking_price: u64,
        payment: Coin<SUI>,
        buyer: address,
        ctx: &mut TxContext
    ) {
        let seller = ticket.current_owner;
        assert!(!ticket.is_used, ETicketAlreadyUsed);
        assert!(asking_price <= ticket.max_resale_price, EResalePriceExceedsCap);
        assert!(coin::value(&payment) == asking_price, EInsufficientPayment);

        // Transfer payment to seller and update ticket state for buyer
        transfer::public_transfer(payment, seller);

        ticket.current_owner = buyer;
        ticket.resale_count = ticket.resale_count + 1;
        ticket.transfer_count = ticket.transfer_count + 1;

        event::emit(TicketResold {
            ticket_id: object::uid_to_inner(&ticket.id),
            seller,
            buyer,
            sale_price: asking_price,
            max_resale_price: ticket.max_resale_price,
        });

        transfer::transfer(ticket, buyer);
    }

    /// Lists a ticket into a shared ResaleEscrow object after validating the price cap on-chain.
    public entry fun list_for_resale(
        ticket: TicketNFT,
        asking_price: u64,
        ctx: &mut TxContext
    ) {
        let seller = ctx.sender();
        assert!(ticket.current_owner == seller, ENotTicketOwner);
        assert!(!ticket.is_used, ETicketAlreadyUsed);
        assert!(asking_price <= ticket.max_resale_price, EResalePriceExceedsCap);

        let escrow = ResaleEscrow {
            id: object::new(ctx),
            ticket,
            seller,
            asking_price,
        };
        transfer::share_object(escrow);
    }

    /// Purchases a listed ticket from `ResaleEscrow`.
    public entry fun buy_listed_ticket(
        escrow: ResaleEscrow,
        payment: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        let buyer = ctx.sender();
        let ResaleEscrow { id, mut ticket, seller, asking_price } = escrow;
        object::delete(id);

        assert!(!ticket.is_used, ETicketAlreadyUsed);
        assert!(asking_price <= ticket.max_resale_price, EResalePriceExceedsCap);
        assert!(coin::value(&payment) == asking_price, EInsufficientPayment);

        transfer::public_transfer(payment, seller);

        ticket.current_owner = buyer;
        ticket.resale_count = ticket.resale_count + 1;
        ticket.transfer_count = ticket.transfer_count + 1;

        event::emit(TicketResold {
            ticket_id: object::uid_to_inner(&ticket.id),
            seller,
            buyer,
            sale_price: asking_price,
            max_resale_price: ticket.max_resale_price,
        });

        transfer::transfer(ticket, buyer);
    }

    /// Marks a valid ticket as used at the venue gate.
    /// Requirements enforced atomically:
    /// 1. `verifier_cap.event_id` must match `registry` ID.
    /// 2. `ticket.event_id` must belong to the `registry` event.
    /// 3. `ticket.is_used` must be `false` (rejects repeated scans with `ETicketAlreadyUsed`).
    public entry fun verify_and_mark_used(
        ticket: &mut TicketNFT,
        registry: &EventRegistry,
        verifier_cap: &VerifierCap,
        ctx: &mut TxContext
    ) {
        let registry_id = object::uid_to_inner(&registry.id);
        assert!(verifier_cap.event_id == registry_id, EUnauthorizedVerifier);
        assert!(ticket.event_id == registry_id, EInvalidEventAssociation);
        assert!(!ticket.is_used, ETicketAlreadyUsed);

        ticket.is_used = true;

        event::emit(TicketUsed {
            ticket_id: object::uid_to_inner(&ticket.id),
            event_id: registry_id,
            attendee: ticket.current_owner,
            verifier: ctx.sender(),
        });
    }

    // -------------------------------------------------------------------------
    // Read-Only Ownership & Status Queries
    // -------------------------------------------------------------------------
    public fun owner(ticket: &TicketNFT): address { ticket.current_owner }
    public fun original_price(ticket: &TicketNFT): u64 { ticket.original_price }
    public fun max_resale_price(ticket: &TicketNFT): u64 { ticket.max_resale_price }
    public fun is_used(ticket: &TicketNFT): bool { ticket.is_used }
    public fun event_id(ticket: &TicketNFT): ID { ticket.event_id }
    public fun transfer_count(ticket: &TicketNFT): u64 { ticket.transfer_count }
    public fun resale_count(ticket: &TicketNFT): u64 { ticket.resale_count }
}
