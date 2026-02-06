const hre = require("hardhat");

async function main() {
  console.log("Deploying AgentRegistry...");

  const AgentRegistry = await hre.ethers.getContractFactory("AgentRegistry");
  const registry = await AgentRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`AgentRegistry deployed to: ${address}`);

  // Mint Agent #0 - Ay the Vizier
  console.log("Minting Agent #0...");
  const tx = await registry.mint("Ay the Vizier", "TUTETH_");
  await tx.wait();

  const agent0 = await registry.getAgent(0);
  console.log("Agent #0 minted:");
  console.log(`  Name: ${agent0.name}`);
  console.log(`  Creator: ${agent0.creator}`);
  console.log(`  Born: ${new Date(Number(agent0.bornAt) * 1000).toISOString()}`);

  console.log("\n✓ Done! Add this to your .env:");
  console.log(`AGENT_REGISTRY_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
