#!/usr/bin/env node
/**
 * deploy-pfp-warren.js — Deploy a PFP image to Warren (on-chain) and optionally mint in AgentPFP contract
 * 
 * Usage:
 *   node deploy-pfp-warren.js <image-path> [--mint <agent-id>] [--name <name>]
 * 
 * Requires env vars (from ~/.openclaw/.env):
 *   WARREN_API_URL, WARREN_PARTNER_KEY, AGNT_MEGAETH_PRIVATE_KEY
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load .env
const envPath = path.join(process.env.HOME, '.openclaw', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m) process.env[m[1]] = m[2];
  }
}

const WARREN_API_URL = process.env.WARREN_API_URL || 'https://thewarren.app';
const WARREN_PARTNER_KEY = process.env.WARREN_PARTNER_KEY;
const MEGAETH_PRIVATE_KEY = process.env.AGNT_MEGAETH_PRIVATE_KEY;
const MEGAETH_RPC = 'https://megaeth.drpc.org';
const MEGAETH_CHAIN_ID = 4326;

// AgentPFP contract on MegaETH
const AGENT_PFP_ADDRESS = '0x3566B44f7c77ec8F6b54862e7C4a8Ba480F71E0f';

if (!WARREN_PARTNER_KEY) { console.error('Missing WARREN_PARTNER_KEY'); process.exit(1); }
if (!MEGAETH_PRIVATE_KEY) { console.error('Missing AGNT_MEGAETH_PRIVATE_KEY'); process.exit(1); }

// Parse args
const args = process.argv.slice(2);
const imagePath = args.find(a => !a.startsWith('--'));
let mintAgentId = null;
let pfpName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mint' && args[i + 1]) mintAgentId = parseInt(args[i + 1]);
  if (args[i] === '--name' && args[i + 1]) pfpName = args[i + 1];
}

if (!imagePath) {
  console.error('Usage: node deploy-pfp-warren.js <image-path> [--mint <agent-id>] [--name <name>]');
  process.exit(1);
}

if (!fs.existsSync(imagePath)) {
  console.error(`File not found: ${imagePath}`);
  process.exit(1);
}

async function partnerFetch(endpoint, body) {
  const resp = await fetch(`${WARREN_API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Warren-Partner-Key': WARREN_PARTNER_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Warren ${endpoint} failed (${resp.status}): ${text}`);
  }
  return resp.json();
}

async function sendPayment(toAddress, weiAmount) {
  // Use cast for simplicity — avoids ethers dependency
  const cmd = `~/.foundry/bin/cast send ${toAddress} --value ${weiAmount} --private-key ${MEGAETH_PRIVATE_KEY} --rpc-url ${MEGAETH_RPC} --chain ${MEGAETH_CHAIN_ID} --json`;
  const result = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  return result.transactionHash;
}

async function mintPFP(agentId, warrenUrl) {
  // mint(uint256 agentId, string warrenUri)
  const cmd = `~/.foundry/bin/cast send ${AGENT_PFP_ADDRESS} "mint(uint256,string)" ${agentId} "${warrenUrl}" --private-key ${MEGAETH_PRIVATE_KEY} --rpc-url ${MEGAETH_RPC} --chain ${MEGAETH_CHAIN_ID} --json`;
  const result = JSON.parse(execSync(cmd, { encoding: 'utf8' }));
  return result.transactionHash;
}

async function main() {
  console.log(`\n🎨 Deploying PFP to Warren (on-chain)...`);
  console.log(`   Image: ${imagePath}`);
  
  // Read and encode image
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Data = imageBuffer.toString('base64');
  const sizeBytes = imageBuffer.length;
  console.log(`   Size: ${(sizeBytes / 1024).toFixed(1)}KB`);

  // Step 1: Estimate fee
  console.log(`\n💰 Estimating fee...`);
  const estimate = await partnerFetch('/api/partner/estimate-fee', { size: sizeBytes });
  console.log(`   Fee: ${estimate.totalEth} ETH (${estimate.chunkCount} chunks)`);
  console.log(`   Relayer: ${estimate.relayerAddress}`);

  // Step 2: Pay relayer
  console.log(`\n💸 Paying relayer...`);
  const paymentTxHash = await sendPayment(estimate.relayerAddress, estimate.totalWei);
  console.log(`   Payment TX: ${paymentTxHash}`);

  // Step 3: Deploy to Warren
  console.log(`\n📡 Deploying to Warren...`);
  const { ethers } = require('ethers');
  const wallet = new ethers.Wallet(MEGAETH_PRIVATE_KEY);
  const senderAddress = wallet.address;
  
  const deployment = await partnerFetch('/api/partner/deploy', {
    data: base64Data,
    paymentTxHash,
    senderAddress,
    siteType: 'image',
    name: pfpName || path.basename(imagePath, path.extname(imagePath)),
  });
  
  console.log(`   ✅ Deployed!`);
  console.log(`   Token ID: ${deployment.tokenId}`);
  console.log(`   URL: ${deployment.url}`);
  console.log(`   Root Chunk: ${deployment.rootChunk}`);
  console.log(`   Gas Used: ${deployment.gasUsed}`);

  // Step 4: Mint in AgentPFP contract (optional)
  if (mintAgentId !== null) {
    console.log(`\n🪙 Minting PFP NFT for Agent #${mintAgentId}...`);
    const mintTxHash = await mintPFP(mintAgentId, deployment.url);
    console.log(`   ✅ Minted! TX: ${mintTxHash}`);
  }

  console.log(`\n🎉 Done!`);
  console.log(JSON.stringify({
    warrenUrl: deployment.url,
    warrenTokenId: deployment.tokenId,
    rootChunk: deployment.rootChunk,
    paymentTxHash,
    sizeBytes,
  }, null, 2));
}

main().catch(err => {
  console.error(`\n❌ Error: ${err.message}`);
  process.exit(1);
});
