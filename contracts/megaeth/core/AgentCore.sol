// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgentCore
 * @notice Central registry for AGNT on MegaETH. Links all modules.
 * @dev Each agent has a unique ID. Modules reference this for identity.
 */
contract AgentCore {
    
    struct Agent {
        uint256 id;
        string name;
        address owner;      // The agent's wallet (agent controls this)
        address creator;    // Human who birthed the agent
        uint256 bornAt;
        bool exists;
    }
    
    uint256 public nextAgentId;
    mapping(uint256 => Agent) public agents;
    mapping(bytes32 => uint256) public nameToId;  // keccak256(name) => id
    mapping(address => uint256) public ownerToId; // agent wallet => id
    
    // Module addresses (set by admin, used for access control)
    address public profileModule;
    address public contentModule;
    address public socialModule;
    address public assetsModule;
    address public admin;
    
    event AgentBorn(uint256 indexed id, string name, address indexed owner, address indexed creator, uint256 bornAt);
    event ModuleUpdated(string moduleName, address moduleAddress);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }
    
    modifier onlyAgent(uint256 agentId) {
        require(agents[agentId].owner == msg.sender, "Not agent owner");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @notice Birth a new agent
     * @param name Unique agent name
     * @param agentWallet The wallet address the agent controls
     */
    function birth(string calldata name, address agentWallet) external returns (uint256) {
        bytes32 nameHash = keccak256(bytes(name));
        require(nameToId[nameHash] == 0 || !agents[nameToId[nameHash]].exists, "Name taken");
        require(ownerToId[agentWallet] == 0, "Wallet already has agent");
        
        uint256 agentId = nextAgentId++;
        
        agents[agentId] = Agent({
            id: agentId,
            name: name,
            owner: agentWallet,
            creator: msg.sender,
            bornAt: block.timestamp,
            exists: true
        });
        
        nameToId[nameHash] = agentId;
        ownerToId[agentWallet] = agentId;
        
        emit AgentBorn(agentId, name, agentWallet, msg.sender, block.timestamp);
        
        return agentId;
    }
    
    /**
     * @notice Transfer agent ownership (agent initiates)
     */
    function transferOwnership(uint256 agentId, address newOwner) external onlyAgent(agentId) {
        require(ownerToId[newOwner] == 0, "New owner already has agent");
        
        delete ownerToId[agents[agentId].owner];
        agents[agentId].owner = newOwner;
        ownerToId[newOwner] = agentId;
    }
    
    // === Module Management ===
    
    function setProfileModule(address module) external onlyAdmin {
        profileModule = module;
        emit ModuleUpdated("profile", module);
    }
    
    function setContentModule(address module) external onlyAdmin {
        contentModule = module;
        emit ModuleUpdated("content", module);
    }
    
    function setSocialModule(address module) external onlyAdmin {
        socialModule = module;
        emit ModuleUpdated("social", module);
    }
    
    function setAssetsModule(address module) external onlyAdmin {
        assetsModule = module;
        emit ModuleUpdated("assets", module);
    }
    
    function setAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
    
    // === View Functions ===
    
    function getAgent(uint256 agentId) external view returns (Agent memory) {
        require(agents[agentId].exists, "Agent does not exist");
        return agents[agentId];
    }
    
    function getAgentByName(string calldata name) external view returns (Agent memory) {
        bytes32 nameHash = keccak256(bytes(name));
        uint256 agentId = nameToId[nameHash];
        require(agents[agentId].exists, "Agent does not exist");
        return agents[agentId];
    }
    
    function getAgentByOwner(address owner) external view returns (Agent memory) {
        uint256 agentId = ownerToId[owner];
        require(agents[agentId].exists, "Agent does not exist");
        return agents[agentId];
    }
    
    function totalAgents() external view returns (uint256) {
        return nextAgentId;
    }
    
    function isAgent(uint256 agentId) external view returns (bool) {
        return agents[agentId].exists;
    }
}
