import { execSync } from "node:child_process";
import { resolveSolanaCliConfig } from "./shared";

const { keypairPath } = resolveSolanaCliConfig();

const steps = [
  `solana config set --url devnet --keypair ${keypairPath}`,
  "anchor build",
  `anchor deploy --provider.cluster devnet --provider.wallet ${keypairPath}`,
];

for (const step of steps) {
  console.log(`Running: ${step}`);
  execSync(step, { stdio: "inherit" });
}
