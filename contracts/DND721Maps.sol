// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

/// @title DND721 Maps — creator-minted map NFTs
/// @notice A minimal, self-contained ERC-721 collection for maps created on
/// the DND721 platform. Any creator can mint a token pointing at their map's
/// metadata (served by the platform at a stable URL). Editions of the same
/// map are separate tokens whose metadata carries the edition number and
/// rarity (e.g. "3 of 2000").
///
/// Deliberately simple and safe:
///   • No admin, no owner, no pausing, no upgradability.
///   • Minting only ever creates a NEW token owned by the CALLER — no
///     function can move or burn anyone else's token outside the standard
///     ERC-721 approve/transfer flow the owner controls.
///   • Fully standard ERC-721 + Metadata, so it works with the DND721Market
///     contract, OpenSea, and any wallet.
///
/// Platform note: on-platform utility (using a private map in campaigns) is
/// granted by the DND721 marketplace ledger at purchase time; this token is
/// the tradeable, collectible half of that ownership.
contract DND721Maps {
    string public constant name = "DND721 Maps";
    string public constant symbol = "D7MAP";

    uint256 public nextTokenId = 1;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => string) private _tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event MapMinted(address indexed creator, uint256 indexed tokenId, string uri);

    // ── ERC-165 ──────────────────────────────────────────────
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7   // ERC-165
            || interfaceId == 0x80ac58cd   // ERC-721
            || interfaceId == 0x5b5e139f;  // ERC-721 Metadata
    }

    // ── Views ────────────────────────────────────────────────
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "token does not exist");
        return owner;
    }

    function balanceOf(address owner) external view returns (uint256) {
        require(owner != address(0), "zero address");
        return _balanceOf[owner];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "token does not exist");
        return _tokenURI[tokenId];
    }

    // ── Minting ──────────────────────────────────────────────
    /// @notice Mint a new map NFT to yourself. `uri` should point at the
    /// platform metadata for the map (and edition), e.g.
    /// https://dnd721.app/api/maps/nft/<mapId>?edition=3
    function mint(string calldata uri) external returns (uint256 tokenId) {
        require(bytes(uri).length > 0, "uri required");
        tokenId = nextTokenId++;
        _ownerOf[tokenId] = msg.sender;
        unchecked { _balanceOf[msg.sender]++; }
        _tokenURI[tokenId] = uri;
        emit Transfer(address(0), msg.sender, tokenId);
        emit MapMinted(msg.sender, tokenId, uri);
    }

    // ── Approvals ────────────────────────────────────────────
    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(msg.sender == owner || isApprovedForAll[owner][msg.sender], "not authorized");
        getApproved[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    // ── Transfers ────────────────────────────────────────────
    function transferFrom(address from, address to, uint256 tokenId) public {
        address owner = ownerOf(tokenId);
        require(owner == from, "wrong from");
        require(to != address(0), "zero address");
        require(
            msg.sender == owner || msg.sender == getApproved[tokenId] || isApprovedForAll[owner][msg.sender],
            "not authorized"
        );
        delete getApproved[tokenId];
        unchecked {
            _balanceOf[from]--;
            _balanceOf[to]++;
        }
        _ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        transferFrom(from, to, tokenId);
        if (to.code.length > 0) {
            require(
                IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data)
                    == IERC721Receiver.onERC721Received.selector,
                "unsafe receiver"
            );
        }
    }
}
