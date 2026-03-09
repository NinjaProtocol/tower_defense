import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("4J8koywfHEzdv7o2DLE1xajsLsBG1BbQp1RxuJqNf7m4");

export function deriveMatchPda(matchId: bigint): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("match"), Buffer.from(new BigUint64Array([matchId]).buffer)],
    PROGRAM_ID,
  )[0];
}
