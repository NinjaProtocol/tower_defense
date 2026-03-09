import { Connection } from "@solana/web3.js";

export function createMagicBlockConnections() {
  const baseConnection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com", "confirmed");
  const erConnection = new Connection(
    process.env.EPHEMERAL_PROVIDER_ENDPOINT ?? "https://devnet.magicblock.app/",
    {
      commitment: "confirmed",
      wsEndpoint: process.env.EPHEMERAL_WS_ENDPOINT ?? "wss://devnet.magicblock.app/",
    },
  );
  return { baseConnection, erConnection };
}
