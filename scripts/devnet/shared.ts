import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram } from "@solana/web3.js";
import type { FortressWars } from "../../target/types/fortress_wars";

export const PROGRAM_ID = new PublicKey("4J8koywfHEzdv7o2DLE1xajsLsBG1BbQp1RxuJqNf7m4");

interface SolanaCliConfig {
  rpcUrl: string;
  keypairPath: string;
}

function materializeWorkspaceKeypair(): string | null {
  const sourcePath = path.resolve(".keypair.local");
  if (!existsSync(sourcePath)) {
    return null;
  }
  const raw = readFileSync(sourcePath, "utf8");
  const encoded = raw.match(/KEYPAIR\s*=\s*(\[[\s\S]*\])/m)?.[1];
  if (!encoded) {
    throw new Error(".keypair.local exists but does not contain a KEYPAIR=[...] entry");
  }
  const walletDir = path.resolve(".wallet");
  mkdirSync(walletDir, { recursive: true });
  const walletPath = path.join(walletDir, "devnet.json");
  writeFileSync(walletPath, `${encoded}\n`, "utf8");
  chmodSync(walletPath, 0o600);
  return walletPath;
}

export function resolveSolanaCliConfig(): SolanaCliConfig {
  const workspaceWallet = materializeWorkspaceKeypair();
  if (workspaceWallet) {
    return {
      rpcUrl: "https://api.devnet.solana.com",
      keypairPath: workspaceWallet,
    };
  }
  const configPath = path.join(os.homedir(), ".config/solana/cli/config.yml");
  const raw = readFileSync(configPath, "utf8");
  const rpcUrl = raw.match(/RPC URL:\s*(.+)$/m)?.[1]?.trim() ?? raw.match(/json_rpc_url:\s*(.+)$/m)?.[1]?.trim() ?? "https://api.devnet.solana.com";
  const keypairPath = raw.match(/Keypair Path:\s*(.+)$/m)?.[1]?.trim() ?? raw.match(/keypair_path:\s*(.+)$/m)?.[1]?.trim() ?? path.join(os.homedir(), ".config/solana/id.json");
  return { rpcUrl, keypairPath };
}

export const defaultConfigArgs = {
  version: 1,
  laneCount: 3,
  maxPlayersPerTeam: 3,
  rewardModel: 1,
  fortressHealth: new BN(100),
  unitKinds: [
    { id: 0, cost: new BN(5), reward: new BN(2), health: 18, damage: 4, range: 8, speed: 6, fortressDamage: 8, cooldownTicks: 1 },
    { id: 1, cost: new BN(9), reward: new BN(4), health: 32, damage: 6, range: 10, speed: 4, fortressDamage: 10, cooldownTicks: 2 },
    { id: 2, cost: new BN(12), reward: new BN(6), health: 26, damage: 9, range: 9, speed: 5, fortressDamage: 14, cooldownTicks: 2 },
  ],
  towerKinds: [
    { id: 0, cost: new BN(8), reward: new BN(4), health: 22, damage: 5, range: 22, attackCooldown: 1 },
    { id: 1, cost: new BN(14), reward: new BN(7), health: 34, damage: 8, range: 18, attackCooldown: 2 },
  ],
};

export function loadProgram(): { provider: anchor.AnchorProvider; program: Program<FortressWars> } {
  const cliConfig = resolveSolanaCliConfig();
  process.env.ANCHOR_WALLET ??= cliConfig.keypairPath;
  process.env.ANCHOR_PROVIDER_URL ??= cliConfig.rpcUrl;
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const idlPath = path.resolve("target/idl/fortress_wars.json");
  const idl = JSON.parse(readFileSync(idlPath, "utf8"));
  const program = new Program<FortressWars>(idl, provider);
  return { provider, program };
}

export function getPayer(provider: anchor.AnchorProvider): Keypair {
  return (provider.wallet as anchor.Wallet & { payer: Keypair }).payer;
}

export function deriveGameConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("game-config")], PROGRAM_ID)[0];
}

export function deriveMatchPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("match"), matchSeed], PROGRAM_ID)[0];
}

export function deriveActionLogPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("action-log"), matchSeed], PROGRAM_ID)[0];
}

export function deriveCheckpointPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("checkpoint"), matchSeed], PROGRAM_ID)[0];
}

export function deriveMatchVaultPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("match-vault"), matchSeed], PROGRAM_ID)[0];
}

export function deriveRewardVaultPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("reward-vault"), matchSeed], PROGRAM_ID)[0];
}

export function deriveMatchVaultAuthorityPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("match-vault-authority"), matchSeed], PROGRAM_ID)[0];
}

export function deriveRewardVaultAuthorityPda(matchId: BN | number): PublicKey {
  const matchSeed = new BN(matchId).toArrayLike(Buffer, "le", 8);
  return PublicKey.findProgramAddressSync([Buffer.from("reward-vault-authority"), matchSeed], PROGRAM_ID)[0];
}

export function derivePlayerStatePda(matchAccount: PublicKey, player: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("player-state"), matchAccount.toBuffer(), player.toBuffer()],
    PROGRAM_ID,
  )[0];
}

export async function ensureAirdrop(provider: anchor.AnchorProvider, recipient: PublicKey, minimumLamports = LAMPORTS_PER_SOL): Promise<void> {
  const balance = await provider.connection.getBalance(recipient);
  if (balance >= minimumLamports) {
    return;
  }
  const signature = await provider.connection.requestAirdrop(recipient, minimumLamports - balance + 0.25 * LAMPORTS_PER_SOL);
  await provider.connection.confirmTransaction(signature, "confirmed");
}

export async function fundWallet(provider: anchor.AnchorProvider, recipient: PublicKey, minimumLamports = LAMPORTS_PER_SOL / 4): Promise<void> {
  const balance = await provider.connection.getBalance(recipient);
  if (balance >= minimumLamports) {
    return;
  }
  const payer = getPayer(provider);
  const signature = await provider.sendAndConfirm(new anchor.web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: recipient,
      lamports: minimumLamports - balance,
    }),
  ));
  await provider.connection.confirmTransaction(signature, "confirmed");
}

export async function createGameMint(provider: anchor.AnchorProvider): Promise<PublicKey> {
  return createMint(provider.connection, getPayer(provider), provider.wallet.publicKey, null, 0);
}

export async function getPlayerAta(provider: anchor.AnchorProvider, mint: PublicKey, owner: PublicKey) {
  return getOrCreateAssociatedTokenAccount(provider.connection, getPayer(provider), mint, owner, true);
}

export async function mintGameTokens(
  provider: anchor.AnchorProvider,
  mint: PublicKey,
  destination: PublicKey,
  amount: bigint,
): Promise<void> {
  const payer = getPayer(provider);
  await mintTo(provider.connection, payer, mint, destination, payer, amount);
}

export const sharedAccounts = {
  tokenProgram: TOKEN_PROGRAM_ID,
  systemProgram: SystemProgram.programId,
  rent: SYSVAR_RENT_PUBKEY,
};

export function formatPublicKey(value: PublicKey): string {
  return value.toBase58();
}

export function createEphemeralPlayer(): Keypair {
  return Keypair.generate();
}
