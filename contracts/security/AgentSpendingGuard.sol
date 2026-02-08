// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentSpendingGuard
 * @notice Enforces per-transaction and daily spending limits for AGNT agents.
 *         Creators set caps; the contract reverts if limits are exceeded.
 *         Integrates with AgentCore as a pre-execution hook.
 */
contract AgentSpendingGuard is Ownable {

    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct SpendingConfig {
        uint128 maxPerTx;          // Max value per single transaction (wei)
        uint128 maxPerDay;         // Max cumulative value per rolling 24h (wei)
        uint128 autoApproveLimit;  // Below this: auto-execute. Above: queue for creator.
        bool    frozen;            // Emergency freeze — blocks all spending
        bool    configured;        // Whether limits have been explicitly set
    }

    struct DailyLedger {
        uint128 spent;             // Amount spent in current window
        uint64  windowStart;       // Start of current 24h window
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    /// @notice AgentCore contract address — only it can call recordSpend
    address public agentCore;

    /// @notice agentId → spending configuration
    mapping(uint256 => SpendingConfig) public configs;

    /// @notice agentId → daily spending ledger
    mapping(uint256 => DailyLedger) public ledgers;

    /// @notice agentId → creator address (cached from AgentCore)
    mapping(uint256 => address) public creators;

    uint256 constant DAY = 24 hours;

    // Default limits for unconfigured agents
    uint128 public defaultMaxPerTx  = 0.01 ether;
    uint128 public defaultMaxPerDay = 0.05 ether;
    uint128 public defaultAutoApproveLimit = 0.005 ether;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event SpendRecorded(uint256 indexed agentId, uint128 amount, uint128 dailyTotal);
    event LimitsUpdated(uint256 indexed agentId, uint128 maxPerTx, uint128 maxPerDay, uint128 autoApproveLimit);
    event AgentFrozen(uint256 indexed agentId);
    event AgentUnfrozen(uint256 indexed agentId);
    event CreatorSet(uint256 indexed agentId, address creator);
    event AgentCoreUpdated(address agentCore);

    // ──────────────────────────────────────────────
    //  Errors
    // ──────────────────────────────────────────────

    error ExceedsPerTxLimit(uint256 agentId, uint128 amount, uint128 limit);
    error ExceedsDailyLimit(uint256 agentId, uint128 newTotal, uint128 limit);
    error AgentIsFrozen(uint256 agentId);
    error NotCreator(uint256 agentId, address caller);
    error NotAgentCore(address caller);
    error RequiresApproval(uint256 agentId, uint128 amount, uint128 autoApproveLimit);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyCreatorOf(uint256 agentId) {
        if (msg.sender != creators[agentId]) revert NotCreator(agentId, msg.sender);
        _;
    }

    modifier onlyAgentCore() {
        if (msg.sender != agentCore) revert NotAgentCore(msg.sender);
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor(address _agentCore) Ownable(msg.sender) {
        agentCore = _agentCore;
    }

    // ──────────────────────────────────────────────
    //  Core: Record & Validate Spending
    // ──────────────────────────────────────────────

    /**
     * @notice Called by AgentCore before executing a value transfer.
     *         Reverts if the spend violates any limit.
     * @param agentId  The agent attempting to spend
     * @param amount   The value in wei
     * @return needsApproval  True if amount > autoApproveLimit (caller should queue)
     */
    function recordSpend(uint256 agentId, uint128 amount)
        external
        onlyAgentCore
        returns (bool needsApproval)
    {
        SpendingConfig memory cfg = _effectiveConfig(agentId);

        // 1. Frozen check
        if (cfg.frozen) revert AgentIsFrozen(agentId);

        // 2. Per-tx check
        if (amount > cfg.maxPerTx) {
            revert ExceedsPerTxLimit(agentId, amount, cfg.maxPerTx);
        }

        // 3. Daily window — reset if 24h elapsed
        DailyLedger storage ledger = ledgers[agentId];
        if (block.timestamp >= ledger.windowStart + DAY) {
            ledger.spent = 0;
            ledger.windowStart = uint64(block.timestamp);
        }

        // 4. Daily limit check
        uint128 newTotal = ledger.spent + amount;
        if (newTotal > cfg.maxPerDay) {
            revert ExceedsDailyLimit(agentId, newTotal, cfg.maxPerDay);
        }

        // 5. Record spend
        ledger.spent = newTotal;

        emit SpendRecorded(agentId, amount, newTotal);

        // 6. Check if human approval needed
        if (amount > cfg.autoApproveLimit) {
            return true;
        }
        return false;
    }

    /**
     * @notice Read-only check without recording. For UI/preview.
     */
    function checkSpend(uint256 agentId, uint128 amount)
        external
        view
        returns (bool allowed, bool needsApproval, string memory reason)
    {
        SpendingConfig memory cfg = _effectiveConfig(agentId);

        if (cfg.frozen) return (false, false, "Agent is frozen");
        if (amount > cfg.maxPerTx) return (false, false, "Exceeds per-tx limit");

        DailyLedger memory ledger = ledgers[agentId];
        uint128 currentSpent = ledger.spent;
        if (block.timestamp >= ledger.windowStart + DAY) {
            currentSpent = 0;
        }
        if (currentSpent + amount > cfg.maxPerDay) {
            return (false, false, "Exceeds daily limit");
        }

        if (amount > cfg.autoApproveLimit) {
            return (true, true, "Requires creator approval");
        }

        return (true, false, "");
    }

    // ──────────────────────────────────────────────
    //  Creator: Configure Limits
    // ──────────────────────────────────────────────

    /**
     * @notice Set spending limits for an agent. Creator only.
     */
    function setLimits(
        uint256 agentId,
        uint128 maxPerTx,
        uint128 maxPerDay,
        uint128 autoApproveLimit
    ) external onlyCreatorOf(agentId) {
        require(maxPerTx <= maxPerDay, "Per-tx cannot exceed daily");
        require(autoApproveLimit <= maxPerTx, "Auto-approve cannot exceed per-tx");

        configs[agentId] = SpendingConfig({
            maxPerTx: maxPerTx,
            maxPerDay: maxPerDay,
            autoApproveLimit: autoApproveLimit,
            frozen: configs[agentId].frozen, // Preserve freeze state
            configured: true
        });

        emit LimitsUpdated(agentId, maxPerTx, maxPerDay, autoApproveLimit);
    }

    /**
     * @notice Emergency freeze — immediately blocks all spending. Creator only.
     */
    function freeze(uint256 agentId) external onlyCreatorOf(agentId) {
        configs[agentId].frozen = true;
        emit AgentFrozen(agentId);
    }

    /**
     * @notice Unfreeze an agent. Creator only.
     */
    function unfreeze(uint256 agentId) external onlyCreatorOf(agentId) {
        configs[agentId].frozen = false;
        emit AgentUnfrozen(agentId);
    }

    // ──────────────────────────────────────────────
    //  Admin: Setup
    // ──────────────────────────────────────────────

    /**
     * @notice Register the creator for an agent. Called by AgentCore on mint.
     */
    function setCreator(uint256 agentId, address creator) external onlyAgentCore {
        creators[agentId] = creator;
        emit CreatorSet(agentId, creator);
    }

    /**
     * @notice Update AgentCore address. Owner only.
     */
    function setAgentCore(address _agentCore) external onlyOwner {
        agentCore = _agentCore;
        emit AgentCoreUpdated(_agentCore);
    }

    /**
     * @notice Update default limits for unconfigured agents. Owner only.
     */
    function setDefaults(
        uint128 _maxPerTx,
        uint128 _maxPerDay,
        uint128 _autoApproveLimit
    ) external onlyOwner {
        require(_maxPerTx <= _maxPerDay, "Per-tx cannot exceed daily");
        require(_autoApproveLimit <= _maxPerTx, "Auto-approve cannot exceed per-tx");
        defaultMaxPerTx = _maxPerTx;
        defaultMaxPerDay = _maxPerDay;
        defaultAutoApproveLimit = _autoApproveLimit;
    }

    // ──────────────────────────────────────────────
    //  View: Current State
    // ──────────────────────────────────────────────

    /**
     * @notice Get remaining daily allowance for an agent.
     */
    function remainingDaily(uint256 agentId) external view returns (uint128) {
        SpendingConfig memory cfg = _effectiveConfig(agentId);
        DailyLedger memory ledger = ledgers[agentId];

        if (block.timestamp >= ledger.windowStart + DAY) {
            return cfg.maxPerDay; // Window reset, full allowance
        }
        if (ledger.spent >= cfg.maxPerDay) return 0;
        return cfg.maxPerDay - ledger.spent;
    }

    /**
     * @notice Get effective config (custom or defaults).
     */
    function effectiveConfig(uint256 agentId) external view returns (SpendingConfig memory) {
        return _effectiveConfig(agentId);
    }

    // ──────────────────────────────────────────────
    //  Internal
    // ──────────────────────────────────────────────

    function _effectiveConfig(uint256 agentId) internal view returns (SpendingConfig memory) {
        SpendingConfig memory cfg = configs[agentId];
        if (cfg.configured) return cfg;

        // Return defaults for unconfigured agents
        return SpendingConfig({
            maxPerTx: defaultMaxPerTx,
            maxPerDay: defaultMaxPerDay,
            autoApproveLimit: defaultAutoApproveLimit,
            frozen: cfg.frozen, // Freeze still applies even if unconfigured
            configured: false
        });
    }
}
