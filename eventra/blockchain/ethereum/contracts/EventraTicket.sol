// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * @title EventraTicket
 * @notice EVENTRA — Ethereum ERC-721 Anti-Scalping NFT Ticketing Contract for Benchmarking.
 *
 * Implements the exact equivalent core operations as the Sui Move `eventra::ticket_nft` module:
 * 1. Event creation with originalPrice, maxResalePrice, and supply cap.
 * 2. Ticket NFT minting (ERC-721) with immutable originalPrice and maxResalePrice.
 * 3. Controlled Ticket transfer (`transferTicket`) rejecting used tickets or unauthorized callers.
 * 4. Maximum resale price enforcement (`executeResale` & `listForResale`/`buyListedTicket`).
 *    Any resale price > maxResalePrice reverts with `ResalePriceExceedsCap(askingPrice, maxResalePrice)`.
 * 5. Atomic one-time venue entry (`verifyAndMarkUsed`) restricted to authorized event verifiers,
 *    preventing duplicate scans (`TicketAlreadyUsed`) and invalid event associations (`InvalidEventAssociation`).
 */
contract EventraTicket is ERC721 {
    // -------------------------------------------------------------------------
    // Custom Errors (Gas-efficient & explicit for testing)
    // -------------------------------------------------------------------------
    error NotTicketOwner(address caller, address owner);
    error ResalePriceExceedsCap(uint256 askingPrice, uint256 maxResalePrice);
    error IncorrectPaymentAmount(uint256 sent, uint256 required);
    error TicketAlreadyUsed(uint256 tokenId);
    error InvalidEventAssociation(uint256 ticketEventId, uint256 verifierEventId);
    error UnauthorizedVerifier(address caller, uint256 eventId);
    error EventSoldOut(uint256 eventId);
    error InvalidResaleCapConfig(uint256 originalPrice, uint256 maxResalePrice);
    error ListingNotActive(uint256 tokenId);

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------
    struct EventConfig {
        uint256 eventId;
        string name;
        address organizer;
        uint256 originalPrice;
        uint256 maxResalePrice;
        uint256 totalSupply;
        uint256 mintedCount;
        bool exists;
    }

    struct TicketData {
        uint256 tokenId;
        uint256 eventId;
        string seatLabel;
        uint256 originalPrice;
        uint256 maxResalePrice;
        bool isUsed;
        uint256 transferCount;
        uint256 resaleCount;
    }

    struct ResaleListing {
        uint256 tokenId;
        address seller;
        uint256 askingPrice;
        bool active;
    }

    // -------------------------------------------------------------------------
    // State Variables
    // -------------------------------------------------------------------------
    uint256 private _nextEventId = 1;
    uint256 private _nextTokenId = 1;

    mapping(uint256 => EventConfig) public events;
    mapping(uint256 => TicketData) public tickets;
    mapping(uint256 => ResaleListing) public listings;
    mapping(uint256 => mapping(address => bool)) public eventVerifiers;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        string name,
        uint256 originalPrice,
        uint256 maxResalePrice,
        uint256 totalSupply
    );

    event TicketMinted(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed owner,
        uint256 originalPrice,
        uint256 maxResalePrice
    );

    event TicketTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 transferCount
    );

    event TicketResold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 salePrice,
        uint256 maxResalePrice
    );

    event TicketUsed(
        uint256 indexed tokenId,
        uint256 indexed eventId,
        address indexed attendee,
        address verifier
    );

    constructor() ERC721("EVENTRA Ticket NFT", "EVNT") {}

    // -------------------------------------------------------------------------
    // 1. Event Creation & Verifier Management
    // -------------------------------------------------------------------------
    function createEvent(
        string calldata name,
        uint256 originalPrice,
        uint256 maxResalePrice,
        uint256 totalSupply
    ) external returns (uint256 eventId) {
        if (maxResalePrice < originalPrice) {
            revert InvalidResaleCapConfig(originalPrice, maxResalePrice);
        }

        eventId = _nextEventId++;
        events[eventId] = EventConfig({
            eventId: eventId,
            name: name,
            organizer: msg.sender,
            originalPrice: originalPrice,
            maxResalePrice: maxResalePrice,
            totalSupply: totalSupply,
            mintedCount: 0,
            exists: true
        });

        eventVerifiers[eventId][msg.sender] = true;

        emit EventCreated(eventId, msg.sender, name, originalPrice, maxResalePrice, totalSupply);
    }

    function setEventVerifier(uint256 eventId, address verifier, bool authorized) external {
        EventConfig storage evt = events[eventId];
        if (msg.sender != evt.organizer) {
            revert UnauthorizedVerifier(msg.sender, eventId);
        }
        eventVerifiers[eventId][verifier] = authorized;
    }

    // -------------------------------------------------------------------------
    // 2. Mint Ticket
    // -------------------------------------------------------------------------
    function mintTicket(
        uint256 eventId,
        address recipient,
        string calldata seatLabel
    ) external returns (uint256 tokenId) {
        EventConfig storage evt = events[eventId];
        if (!evt.exists || msg.sender != evt.organizer) {
            revert UnauthorizedVerifier(msg.sender, eventId);
        }
        if (evt.mintedCount >= evt.totalSupply) {
            revert EventSoldOut(eventId);
        }

        evt.mintedCount += 1;
        tokenId = _nextTokenId++;

        _safeMint(recipient, tokenId);

        tickets[tokenId] = TicketData({
            tokenId: tokenId,
            eventId: eventId,
            seatLabel: seatLabel,
            originalPrice: evt.originalPrice,
            maxResalePrice: evt.maxResalePrice,
            isUsed: false,
            transferCount: 0,
            resaleCount: 0
        });

        emit TicketMinted(tokenId, eventId, recipient, evt.originalPrice, evt.maxResalePrice);
    }

    // -------------------------------------------------------------------------
    // 3. Controlled Ticket Transfer
    // -------------------------------------------------------------------------
    function transferTicket(uint256 tokenId, address recipient) external {
        address currentOwner = ownerOf(tokenId);
        if (msg.sender != currentOwner) {
            revert NotTicketOwner(msg.sender, currentOwner);
        }
        TicketData storage t = tickets[tokenId];
        if (t.isUsed) {
            revert TicketAlreadyUsed(tokenId);
        }

        // Cancel any active listing on transfer
        if (listings[tokenId].active) {
            listings[tokenId].active = false;
        }

        t.transferCount += 1;
        _transfer(currentOwner, recipient, tokenId);

        emit TicketTransferred(tokenId, currentOwner, recipient, t.transferCount);
    }

    // -------------------------------------------------------------------------
    // 4. Resale Price Cap Enforcement
    // -------------------------------------------------------------------------
    function listForResale(uint256 tokenId, uint256 askingPrice) external {
        address currentOwner = ownerOf(tokenId);
        if (msg.sender != currentOwner) {
            revert NotTicketOwner(msg.sender, currentOwner);
        }
        TicketData storage t = tickets[tokenId];
        if (t.isUsed) {
            revert TicketAlreadyUsed(tokenId);
        }
        if (askingPrice > t.maxResalePrice) {
            revert ResalePriceExceedsCap(askingPrice, t.maxResalePrice);
        }

        listings[tokenId] = ResaleListing({
            tokenId: tokenId,
            seller: currentOwner,
            askingPrice: askingPrice,
            active: true
        });
    }

    function buyListedTicket(uint256 tokenId) external payable {
        ResaleListing storage listing = listings[tokenId];
        if (!listing.active) {
            revert ListingNotActive(tokenId);
        }
        TicketData storage t = tickets[tokenId];
        if (t.isUsed) {
            revert TicketAlreadyUsed(tokenId);
        }
        if (listing.askingPrice > t.maxResalePrice) {
            revert ResalePriceExceedsCap(listing.askingPrice, t.maxResalePrice);
        }
        if (msg.value != listing.askingPrice) {
            revert IncorrectPaymentAmount(msg.value, listing.askingPrice);
        }

        address seller = listing.seller;
        uint256 salePrice = listing.askingPrice;
        listing.active = false;

        t.resaleCount += 1;
        t.transferCount += 1;

        _transfer(seller, msg.sender, tokenId);

        (bool sent, ) = payable(seller).call{value: salePrice}("");
        require(sent, "ETH transfer failed");

        emit TicketResold(tokenId, seller, msg.sender, salePrice, t.maxResalePrice);
    }

    /**
     * @notice Direct atomic resale helper (matches Sui's `execute_resale` benchmark operation)
     */
    function executeResale(
        uint256 tokenId,
        uint256 askingPrice,
        address buyer
    ) external payable {
        address seller = ownerOf(tokenId);
        TicketData storage t = tickets[tokenId];
        if (t.isUsed) {
            revert TicketAlreadyUsed(tokenId);
        }
        if (askingPrice > t.maxResalePrice) {
            revert ResalePriceExceedsCap(askingPrice, t.maxResalePrice);
        }
        if (msg.value != askingPrice) {
            revert IncorrectPaymentAmount(msg.value, askingPrice);
        }

        t.resaleCount += 1;
        t.transferCount += 1;

        _transfer(seller, buyer, tokenId);

        (bool sent, ) = payable(seller).call{value: askingPrice}("");
        require(sent, "ETH transfer failed");

        emit TicketResold(tokenId, seller, buyer, askingPrice, t.maxResalePrice);
    }

    // -------------------------------------------------------------------------
    // 5. One-Time Venue Entry Verification
    // -------------------------------------------------------------------------
    function verifyAndMarkUsed(uint256 tokenId, uint256 expectedEventId) external {
        if (!eventVerifiers[expectedEventId][msg.sender]) {
            revert UnauthorizedVerifier(msg.sender, expectedEventId);
        }
        TicketData storage t = tickets[tokenId];
        if (t.eventId != expectedEventId) {
            revert InvalidEventAssociation(t.eventId, expectedEventId);
        }
        if (t.isUsed) {
            revert TicketAlreadyUsed(tokenId);
        }

        t.isUsed = true;
        if (listings[tokenId].active) {
            listings[tokenId].active = false;
        }

        emit TicketUsed(tokenId, expectedEventId, ownerOf(tokenId), msg.sender);
    }

    // -------------------------------------------------------------------------
    // 6. Read-Only Queries
    // -------------------------------------------------------------------------
    function getTicketState(uint256 tokenId)
        external
        view
        returns (
            address currentOwner,
            uint256 eventId,
            uint256 originalPrice,
            uint256 maxResalePrice,
            bool isUsed,
            uint256 transferCount,
            uint256 resaleCount
        )
    {
        TicketData storage t = tickets[tokenId];
        return (
            ownerOf(tokenId),
            t.eventId,
            t.originalPrice,
            t.maxResalePrice,
            t.isUsed,
            t.transferCount,
            t.resaleCount
        );
    }
}
