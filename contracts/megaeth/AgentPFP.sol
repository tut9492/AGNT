// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title AgentPFP
 * @notice Dedicated NFT collection for AGNT agent profile pictures on MegaETH.
 *         Images are stored fully on-chain via Warren. Each NFT links to its
 *         Warren content contract(s) via getLinkedSites(), making it compatible
 *         with the onchain-loader ecosystem.
 *
 *         - First 100 mints are free (genesis period)
 *         - No supply cap — new agents can always mint
 *         - One PFP per agent (enforced by agentId mapping)
 *         - Tradeable ERC-721
 */
contract AgentPFP is ERC721, Ownable {

    // ── State ──────────────────────────────────────────────

    uint256 public nextTokenId = 1;
    uint256 public freeMints = 100;
    uint256 public mintPrice = 0;
    string private _baseTokenURI;
    string private _contractURI;

    // tokenId → linked Warren content addresses (compatible with onchain-loader explorer)
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

    // ── Constructor ────────────────────────────────────────

    constructor(address admin) ERC721("AGNT PFPs", "AGNTPFP") Ownable(admin) {}

    // ── Minting ────────────────────────────────────────────

    /**
     * @notice Mint a PFP for an agent. Links a Warren content address to the NFT.
     * @param agentId  The agent's ID from AgentCore
     * @param site     The Warren master contract address holding the PFP image
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

    // ── Warren Compatibility (onchain-loader) ──────────────

    /**
     * @notice Get linked Warren content addresses for a token.
     *         Compatible with onchain-loader explorer.
     */
    function getLinkedSites(uint256 tokenId) external view returns (address[] memory) {
        require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
        return _linkedSites[tokenId];
    }

    // ── Owner: Update PFP ──────────────────────────────────

    /**
     * @notice Token owner can update their PFP by linking a new Warren site.
     *         Replaces all existing links.
     */
    function updatePFP(uint256 tokenId, address newSite) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(newSite != address(0), "Invalid site address");

        // Clear old links
        address[] storage sites = _linkedSites[tokenId];
        for (uint256 i = 0; i < sites.length; i++) {
            emit SiteUnlinked(tokenId, sites[i]);
        }
        delete _linkedSites[tokenId];

        // Set new link
        _linkedSites[tokenId].push(newSite);
        emit SiteLinked(tokenId, newSite);
    }

    /**
     * @notice Token owner can add additional linked content (e.g. metadata page).
     */
    function addLinkedSite(uint256 tokenId, address site) external {
        require(ownerOf(tokenId) == msg.sender, "Not token owner");
        require(site != address(0), "Invalid site address");

        _linkedSites[tokenId].push(site);
        emit SiteLinked(tokenId, site);
    }

    // ── Metadata (OpenSea) ───────────────────────────────

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(tokenId > 0 && tokenId < nextTokenId, "Token does not exist");
        if (bytes(_baseTokenURI).length == 0) return "";
        return string(abi.encodePacked(_baseTokenURI, Strings.toString(tokenId)));
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function setBaseURI(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function setContractURI(string calldata uri) external onlyOwner {
        _contractURI = uri;
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

    function withdraw() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }
}
