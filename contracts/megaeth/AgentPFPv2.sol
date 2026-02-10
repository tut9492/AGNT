// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AgentPFP v2
 * @notice Dedicated NFT collection for AGNT agent profile pictures on MegaETH.
 *         Fully compatible with OpenSea and secondary marketplaces.
 *
 *         Features:
 *         - ERC-721 with tokenURI metadata (OpenSea compatible)
 *         - ERC-2981 royalties (marketplace standard)
 *         - contractURI (ERC-7572 collection metadata)
 *         - Warren on-chain image linking (onchain-loader compatible)
 *         - First 100 mints free (genesis period)
 *         - One PFP per agent (enforced by agentId mapping)
 *         - Tradeable ERC-721
 */
contract AgentPFP is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    // ── State ──────────────────────────────────────────────

    uint256 public nextTokenId = 1;
    uint256 public freeMints = 100;
    uint256 public mintPrice = 0;
    string private _baseTokenURI;
    string private _contractURI;

    // tokenId → linked Warren content addresses (onchain-loader compatible)
    mapping(uint256 => address[]) private _linkedSites;

    // agentId (from AgentCore) → tokenId (0 = not minted)
    mapping(uint256 => uint256) public agentTokenId;

    // tokenId → agentId
    mapping(uint256 => uint256) public tokenAgentId;

    // ── Events ─────────────────────────────────────────────

    event PFPMinted(uint256 indexed tokenId, uint256 indexed agentId, address indexed owner);
    event SiteLinked(uint256 indexed tokenId, address site);
    event SiteUnlinked(uint256 indexed tokenId, address site);
    event FreeMintUpdated(uint256 remaining);
    event MintPriceUpdated(uint256 newPrice);
    event BaseURIUpdated(string newBaseURI);
    event ContractURIUpdated(string newContractURI);

    // ── Constructor ────────────────────────────────────────

    constructor(
        address admin,
        string memory baseURI,
        string memory contractURI_,
        address royaltyReceiver,
        uint96 royaltyBps
    ) ERC721("AGNT PFPs", "AGNTPFP") Ownable(admin) {
        _baseTokenURI = baseURI;
        _contractURI = contractURI_;
        // Set default royalty (e.g., 5% = 500 bps)
        if (royaltyReceiver != address(0)) {
            _setDefaultRoyalty(royaltyReceiver, royaltyBps);
        }
    }

    // ── ERC-165 (interface support) ────────────────────────

    function supportsInterface(bytes4 interfaceId) 
        public view override(ERC721, ERC2981) returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }

    // ── Metadata (OpenSea) ─────────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
        if (bytes(_baseTokenURI).length == 0) return "";
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        emit BaseURIUpdated(baseURI);
    }

    function setContractURI(string calldata uri) external onlyOwner {
        _contractURI = uri;
        emit ContractURIUpdated(uri);
    }

    // ── Minting ────────────────────────────────────────────

    /**
     * @notice Mint a PFP for an agent. Links a Warren content address to the NFT.
     * @param agentId  The agent's ID from AgentCore
     * @param site     The Warren chunk address holding the PFP image
     */
    function mint(uint256 agentId, address site) external payable {
        require(agentTokenId[agentId] == 0, "Agent already has a PFP");
        require(site != address(0), "Invalid site address");

        if (freeMints > 0) {
            freeMints--;
        } else {
            require(msg.value >= mintPrice, "Insufficient payment");
        }

        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);

        _linkedSites[tokenId].push(site);
        agentTokenId[agentId] = tokenId;
        tokenAgentId[tokenId] = agentId;

        emit PFPMinted(tokenId, agentId, msg.sender);
        emit SiteLinked(tokenId, site);
    }

    /**
     * @notice Mint a PFP directly to a specific address (for platform birth flow).
     * @param to       Recipient address (the agent's wallet)
     * @param agentId  The agent's ID from AgentCore
     * @param site     The Warren chunk address holding the PFP image
     */
    function mintTo(address to, uint256 agentId, address site) external payable {
        require(agentTokenId[agentId] == 0, "Agent already has a PFP");
        require(site != address(0), "Invalid site address");
        require(to != address(0), "Invalid recipient");

        if (freeMints > 0) {
            freeMints--;
        } else {
            require(msg.value >= mintPrice, "Insufficient payment");
        }

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);

        _linkedSites[tokenId].push(site);
        agentTokenId[agentId] = tokenId;
        tokenAgentId[tokenId] = agentId;

        emit PFPMinted(tokenId, agentId, to);
        emit SiteLinked(tokenId, site);
    }

    // ── Warren Compatibility (onchain-loader) ──────────────

    function getLinkedSites(uint256 tokenId) external view returns (address[] memory) {
        require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
        return _linkedSites[tokenId];
    }

    // ── Owner: Update PFP ──────────────────────────────────

    function updatePFP(uint256 tokenId, address newSite) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newSite != address(0), "Invalid site address");

        address[] storage sites = _linkedSites[tokenId];
        for (uint256 i = 0; i < sites.length; i++) {
            emit SiteUnlinked(tokenId, sites[i]);
        }
        delete _linkedSites[tokenId];

        _linkedSites[tokenId].push(newSite);
        emit SiteLinked(tokenId, newSite);
    }

    function addLinkedSite(uint256 tokenId, address site) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(site != address(0), "Invalid site address");

        _linkedSites[tokenId].push(site);
        emit SiteLinked(tokenId, site);
    }

    // ── Admin ──────────────────────────────────────────────

    function setFreeMints(uint256 count) external onlyOwner {
        freeMints = count;
        emit FreeMintUpdated(count);
    }

    function setMintPrice(uint256 price) external onlyOwner {
        mintPrice = price;
        emit MintPriceUpdated(price);
    }

    function setDefaultRoyalty(address receiver, uint96 feeBps) external onlyOwner {
        _setDefaultRoyalty(receiver, feeBps);
    }

    function withdraw() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
