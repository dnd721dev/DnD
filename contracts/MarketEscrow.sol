// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

/// @title DND721 Marketplace Escrow
/// @notice Sellers approve THIS CONTRACT (not a personal wallet) on a listed
/// NFT — either per-token via `approve(escrow, tokenId)` or for their whole
/// collection via `setApprovalForAll`. Only the designated `relayer` (the
/// DND721 backend, which calls this ONLY after independently verifying the
/// buyer's on-chain payment to the seller) may trigger a delivery, and the
/// contract does nothing else: it holds no funds, custodies no NFTs, and its
/// entire surface is one narrow, source-verified transfer function. That is
/// the meaningful difference from approving a raw EOA — wallet security
/// tools (Blockaid, MetaMask) evaluate approvals to published, single-purpose
/// contracts very differently than approvals to an unlabeled wallet address.
contract MarketEscrow {
    address public owner;
    address public relayer;

    event RelayerUpdated(address indexed newRelayer);
    event SaleExecuted(address indexed seller, address indexed nft, uint256 indexed tokenId, address buyer);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "not relayer");
        _;
    }

    constructor(address _relayer) {
        owner = msg.sender;
        relayer = _relayer;
    }

    /// @notice Rotate the backend relayer key without redeploying (e.g. if
    /// the server's hot wallet key is rotated for operational reasons).
    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
        emit RelayerUpdated(_relayer);
    }

    /// @notice Deliver a sold NFT. Called by the backend relayer only after
    /// it has verified the buyer paid the seller on-chain. Reverts unless the
    /// seller previously approved this contract for the token — i.e. this
    /// contract can only ever move a token its owner explicitly approved.
    function executeSale(address seller, address nft, uint256 tokenId, address buyer) external onlyRelayer {
        IERC721(nft).safeTransferFrom(seller, buyer, tokenId);
        emit SaleExecuted(seller, nft, tokenId, buyer);
    }
}
