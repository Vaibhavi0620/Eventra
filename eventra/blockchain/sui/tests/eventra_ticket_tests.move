/// EVENTRA — Move Automated Test Suite for `eventra::ticket_nft`
///
/// Covers all 11 required test scenarios:
/// 1. Ticket creation
/// 2. Correct initial ownership
/// 3. Valid transfer
/// 4. Unauthorized transfer rejection
/// 5. Resale below the cap (1,100 <= 1,200)
/// 6. Resale at the cap (1,200 <= 1,200)
/// 7. Resale above the cap rejection (1,500 > 1,200)
/// 8. Invalid event association rejection
/// 9. First valid entry (`verify_and_mark_used`)
/// 10. Repeated entry rejection (`ETicketAlreadyUsed`)
/// 11. Unauthorized entry verification rejection (`EUnauthorizedVerifier`)
#[test_only]
module eventra::ticket_nft_tests {
    use std::string;
    use sui::coin;
    use sui::sui::SUI;
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::transfer;
    use eventra::ticket_nft::{
        Self,
        EventRegistry,
        TicketNFT,
        VerifierCap
    };

    const ORGANIZER: address = @0xA11CE;
    const ORGANIZER_2: address = @0xDE02;
    const BUYER_1: address = @0xB0B;
    const BUYER_2: address = @0xCA101;
    const ATTACKER: address = @0xBAD;

    fun setup_event(scenario: &mut Scenario) {
        ts::next_tx(scenario, ORGANIZER);
        {
            let cap = ticket_nft::create_event(
                string::utf8(b"EVENTRA Sonic Horizons 2026"),
                1000, // original_price = 1,000 units
                1200, // max_resale_price = 1,200 units
                100,
                ts::ctx(scenario)
            );
            transfer::public_transfer(cap, ORGANIZER);
        };
    }

    #[test]
    fun test_1_and_2_ticket_creation_and_initial_ownership() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"VIP-01"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, BUYER_1);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            assert!(ticket_nft::owner(&ticket) == BUYER_1, 0);
            assert!(ticket_nft::original_price(&ticket) == 1000, 1);
            assert!(ticket_nft::max_resale_price(&ticket) == 1200, 2);
            assert!(!ticket_nft::is_used(&ticket), 3);
            ts::return_to_sender(&scenario, ticket);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_3_valid_transfer() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-10"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, BUYER_1);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            ticket_nft::transfer_ticket(ticket, BUYER_2, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, BUYER_2);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            assert!(ticket_nft::owner(&ticket) == BUYER_2, 0);
            assert!(ticket_nft::transfer_count(&ticket) == 1, 1);
            ts::return_to_sender(&scenario, ticket);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = eventra::ticket_nft::ENotTicketOwner)]
    fun test_4_unauthorized_transfer_rejected() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            let ticket = ticket_nft::mint_ticket(
                &mut registry,
                string::utf8(b"GA-11"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::next_tx(&mut scenario, ATTACKER);
            ticket_nft::transfer_ticket(ticket, ATTACKER, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_5_resale_below_cap_1100_allowed() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-12"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, BUYER_1);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1100, ts::ctx(&mut scenario));
            ticket_nft::execute_resale(ticket, 1100, payment, BUYER_2, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, BUYER_2);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            assert!(ticket_nft::owner(&ticket) == BUYER_2, 0);
            assert!(ticket_nft::resale_count(&ticket) == 1, 1);
            ts::return_to_sender(&scenario, ticket);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_6_resale_at_cap_1200_allowed() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-13"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, BUYER_1);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1200, ts::ctx(&mut scenario));
            ticket_nft::execute_resale(ticket, 1200, payment, BUYER_2, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, BUYER_2);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            assert!(ticket_nft::owner(&ticket) == BUYER_2, 0);
            assert!(ticket_nft::resale_count(&ticket) == 1, 1);
            ts::return_to_sender(&scenario, ticket);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = eventra::ticket_nft::EResalePriceExceedsCap)]
    fun test_7_resale_above_cap_1500_rejected() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-14"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, BUYER_1);
        {
            let ticket = ts::take_from_sender<TicketNFT>(&scenario);
            let payment = coin::mint_for_testing<SUI>(1500, ts::ctx(&mut scenario));
            ticket_nft::execute_resale(ticket, 1500, payment, BUYER_2, ts::ctx(&mut scenario));
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = eventra::ticket_nft::EInvalidEventAssociation)]
    fun test_8_invalid_event_association_rejected() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        // Create a second independent event
        ts::next_tx(&mut scenario, ORGANIZER_2);
        {
            let cap2 = ticket_nft::create_event(
                string::utf8(b"Different Event"),
                800,
                960,
                50,
                ts::ctx(&mut scenario)
            );
            transfer::public_transfer(cap2, ORGANIZER_2);
        };

        // Mint ticket for Event 1
        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry1 = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry1,
                string::utf8(b"GA-15"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry1);
        };

        // Attempt to verify Event 1's ticket against Event 2's registry & cap
        ts::next_tx(&mut scenario, ORGANIZER_2);
        {
            let registry2 = ts::take_shared<EventRegistry>(&scenario);
            let cap2 = ts::take_from_sender<VerifierCap>(&scenario);
            let mut ticket1 = ts::take_from_address<TicketNFT>(&scenario, BUYER_1);

            ticket_nft::verify_and_mark_used(&mut ticket1, &registry2, &cap2, ts::ctx(&mut scenario));

            ts::return_to_address(BUYER_1, ticket1);
            transfer::public_transfer(cap2, ORGANIZER_2);
            ts::return_shared(registry2);
        };

        ts::end(scenario);
    }

    #[test]
    fun test_9_first_valid_entry_marks_ticket_used() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-16"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let registry = ts::take_shared<EventRegistry>(&scenario);
            let cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut ticket = ts::take_from_address<TicketNFT>(&scenario, BUYER_1);

            ticket_nft::verify_and_mark_used(&mut ticket, &registry, &cap, ts::ctx(&mut scenario));
            assert!(ticket_nft::is_used(&ticket), 0);

            ts::return_to_address(BUYER_1, ticket);
            transfer::public_transfer(cap, ORGANIZER);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = eventra::ticket_nft::ETicketAlreadyUsed)]
    fun test_10_repeated_entry_rejected() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry,
                string::utf8(b"GA-17"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let registry = ts::take_shared<EventRegistry>(&scenario);
            let cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut ticket = ts::take_from_address<TicketNFT>(&scenario, BUYER_1);

            // First scan succeeds
            ticket_nft::verify_and_mark_used(&mut ticket, &registry, &cap, ts::ctx(&mut scenario));
            // Second scan must fail atomically with ETicketAlreadyUsed
            ticket_nft::verify_and_mark_used(&mut ticket, &registry, &cap, ts::ctx(&mut scenario));

            ts::return_to_address(BUYER_1, ticket);
            transfer::public_transfer(cap, ORGANIZER);
            ts::return_shared(registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = eventra::ticket_nft::EUnauthorizedVerifier)]
    fun test_11_unauthorized_entry_verification_rejected() {
        let mut scenario = ts::begin(ORGANIZER);
        setup_event(&mut scenario);

        // Create a second event so ORGANIZER_2 holds a VerifierCap for a different event
        ts::next_tx(&mut scenario, ORGANIZER_2);
        {
            let wrong_cap = ticket_nft::create_event(
                string::utf8(b"Unrelated Event"),
                500,
                600,
                20,
                ts::ctx(&mut scenario)
            );
            transfer::public_transfer(wrong_cap, ORGANIZER_2);
        };

        ts::next_tx(&mut scenario, ORGANIZER);
        {
            let mut registry1 = ts::take_shared<EventRegistry>(&scenario);
            ticket_nft::mint_and_deliver(
                &mut registry1,
                string::utf8(b"GA-18"),
                BUYER_1,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry1);
        };

        ts::next_tx(&mut scenario, ORGANIZER_2);
        {
            let registry1 = ts::take_shared<EventRegistry>(&scenario);
            let wrong_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut ticket1 = ts::take_from_address<TicketNFT>(&scenario, BUYER_1);

            // Must abort with EUnauthorizedVerifier because wrong_cap.event_id != registry1.id
            ticket_nft::verify_and_mark_used(&mut ticket1, &registry1, &wrong_cap, ts::ctx(&mut scenario));

            ts::return_to_address(BUYER_1, ticket1);
            transfer::public_transfer(wrong_cap, ORGANIZER_2);
            ts::return_shared(registry1);
        };

        ts::end(scenario);
    }
}
