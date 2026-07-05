// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/// @title DND721 Marketplace (trustless atomic swap)
/// @notice Replaces the earlier relayer-based MarketEscrow after Blockaid
/// review. There is NO privileged role that can move user tokens:
///
///   • A seller lists their own NFT with a fixed price (ETH or an ERC-20
///     such as DND721), optionally reserved for a single buyer.
///   • The BUYER completes the sale themselves: payment goes to the seller
///     and the NFT goes to the buyer in ONE atomic transaction. If either
///     leg fails, the whole transaction reverts.
///   • Only the token's owner can list or cancel it. An approval given to
///     this contract can only ever be spent through a listing the owner
///     created, at the owner's price, paid to the owner.
///
/// The contract holds no funds and no NFTs, has no owner/admin, no relayer,
/// and cannot be upgraded.
contract DND721Market {
    struct Listing {
        address seller;
        address currency;      // address(0) = native ETH, else ERC-20 token
        uint256 price;         // in wei (18 decimals for DND721 / ETH)
        address reservedBuyer; // address(0) = anyone may buy
    }

    /// nft contract => tokenId => active listing
    mapping(address => mapping(uint256 => Listing)) public listings;

    event Listed(address indexed nft, uint256 indexed tokenId, address indexed seller, address currency, uint256 price, address reservedBuyer);
    event Cancelled(address indexed nft, uint256 indexed tokenId, address indexed seller);
    event Sold(address indexed nft, uint256 indexed tokenId, address seller, address indexed buyer, address currency, uint256 price);

    /// @notice List an NFT you own at a fixed price. Requires you to have
    /// approved this contract for the token (approve / setApprovalForAll).
    /// @param reservedBuyer optional: restrict the sale to one buyer
    /// (used for accepted buyout bids); address(0) = open to anyone.
    function list(address nft, uint256 tokenId, address currency, uint256 price, address reservedBuyer) external {
        require(IERC721(nft).ownerOf(tokenId) == msg.sender, "not token owner");
        require(price > 0, "price required");
        listings[nft][tokenId] = Listing(msg.sender, currency, price, reservedBuyer);
        emit Listed(nft, tokenId, msg.sender, currency, price, reservedBuyer);
    }

    /// @notice Cancel your own listing at any time.
    function cancel(address nft, uint256 tokenId) external {
        require(listings[nft][tokenId].seller == msg.sender, "not seller");
        delete listings[nft][tokenId];
        emit Cancelled(nft, tokenId, msg.sender);
    }

    /// @notice Buy a listed NFT. Payment (ETH or ERC-20) goes directly to the
    /// seller and the NFT to the buyer, atomically. No third party can
    /// trigger or redirect this — only the buyer, paying the listed price.
    function buy(address nft, uint256 tokenId) external payable {
        Listing memory l = listings[nft][tokenId];
        require(l.seller != address(0), "not listed");
        require(l.reservedBuyer == address(0) || l.reservedBuyer == msg.sender, "reserved for another buyer");
        // The seller must still own the token (guards stale listings).
        require(IERC721(nft).ownerOf(tokenId) == l.seller, "seller no longer owns token");

        // Effects before interactions.
        delete listings[nft][tokenId];

        if (l.currency == address(0)) {
            require(msg.value >= l.price, "insufficient payment");
            (bool paid, ) = l.seller.call{value: msg.value}("");
            require(paid, "payment failed");
        } else {
            require(msg.value == 0, "unexpected ETH");
            require(IERC20(l.currency).transferFrom(msg.sender, l.seller, l.price), "token payment failed");
        }

        IERC721(nft).safeTransferFrom(l.seller, msg.sender, tokenId);
        emit Sold(nft, tokenId, l.seller, msg.sender, l.currency, l.price);
    }
}
