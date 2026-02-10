import { ethers } from 'ethers';

// MegaETH (Chain ID: 4326)
const AGENT_CORE_ADDRESS = '0x3D9BA898575Aa52E1ff367310eC6fb5e2570b3DF';
const AGENT_PROFILE_ADDRESS = '0xa42BE49eB52fBB8889cDdfDe8f78F5FE3cEF094E';

const AGENT_CORE_ABI = [
  'function getAgent(uint256 agentId) view returns (tuple(uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists))',
  'function getAgentByName(string name) view returns (tuple(uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists))',
  'function getAgentByOwner(address owner) view returns (tuple(uint256 id, string name, address owner, address creator, uint256 bornAt, bool exists))',
  'function totalAgents() view returns (uint256)',
  'function freeMintsRemaining() view returns (uint256)',
  'function isAgent(uint256 agentId) view returns (bool)',
  'function isFreeMintsAvailable() view returns (bool)',
  'function birth(string name, address agentWallet) returns (uint256)',
];

const AGENT_PROFILE_ABI = [
  'function getProfile(uint256 agentId) view returns (tuple(string bio, string avatar, string website, string twitter, string github, string[] tags, uint256 updatedAt))',
  'function getAvatar(uint256 agentId) view returns (string)',
  'function getBio(uint256 agentId) view returns (string)',
  'function getTags(uint256 agentId) view returns (string[])',
  'function setAvatar(uint256 agentId, string avatar)',
  'function setBio(uint256 agentId, string bio)',
  'function setProfile(uint256 agentId, string bio, string avatar, string website, string twitter, string github, string[] tags)',
];

const provider = new ethers.JsonRpcProvider('https://megaeth.drpc.org');
const coreContract = new ethers.Contract(AGENT_CORE_ADDRESS, AGENT_CORE_ABI, provider);
const profileContract = new ethers.Contract(AGENT_PROFILE_ADDRESS, AGENT_PROFILE_ABI, provider);

// Legacy export for backward compatibility
const contract = coreContract;

export interface OnChainAgent {
  id: number;
  name: string;
  owner: string;
  creator: string;
  bornAt: Date;
  exists: boolean;
}

export interface OnChainProfile {
  bio: string;
  avatar: string;
  avatarUrl: string;
  website: string;
  twitter: string;
  github: string;
  tags: string[];
  updatedAt: Date;
}

export async function getOnChainAgent(id: number): Promise<OnChainAgent | null> {
  try {
    const agent = await coreContract.getAgent(id);
    if (!agent.exists) return null;
    return {
      id: Number(agent.id),
      name: agent.name,
      owner: agent.owner,
      creator: agent.creator,
      bornAt: new Date(Number(agent.bornAt) * 1000),
      exists: agent.exists,
    };
  } catch {
    return null;
  }
}

export async function getOnChainProfile(id: number): Promise<OnChainProfile | null> {
  try {
    const profile = await profileContract.getProfile(id);
    const avatar = profile.avatar || '';
    // Convert ipfs:// to gateway URL
    const avatarUrl = avatar.startsWith('ipfs://')
      ? `https://gateway.pinata.cloud/ipfs/${avatar.replace('ipfs://', '')}`
      : avatar;
    return {
      bio: profile.bio,
      avatar,
      avatarUrl,
      website: profile.website,
      twitter: profile.twitter,
      github: profile.github,
      tags: profile.tags || [],
      updatedAt: new Date(Number(profile.updatedAt) * 1000),
    };
  } catch {
    return null;
  }
}

export async function getTotalAgents(): Promise<number> {
  const total = await coreContract.totalAgents();
  return Number(total);
}

export async function getFreeMintsRemaining(): Promise<number> {
  const remaining = await coreContract.freeMintsRemaining();
  return Number(remaining);
}

export async function findAgentByName(name: string): Promise<OnChainAgent | null> {
  try {
    const agent = await coreContract.getAgentByName(name);
    if (!agent.exists) return null;
    return {
      id: Number(agent.id),
      name: agent.name,
      owner: agent.owner,
      creator: agent.creator,
      bornAt: new Date(Number(agent.bornAt) * 1000),
      exists: agent.exists,
    };
  } catch {
    return null;
  }
}

export {
  AGENT_CORE_ADDRESS,
  AGENT_PROFILE_ADDRESS,
  coreContract,
  profileContract,
  provider,
};

export const EXPLORER_URL = 'https://mega.etherscan.io/address/' + AGENT_CORE_ADDRESS;

// Legacy
export const BASESCAN_URL = EXPLORER_URL;
