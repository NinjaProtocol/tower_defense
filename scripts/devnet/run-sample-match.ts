import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
	createEphemeralPlayer,
	defaultConfigArgs,
	deriveActionLogPda,
	deriveCheckpointPda,
	deriveGameConfigPda,
	deriveMatchPda,
	deriveMatchVaultAuthorityPda,
	deriveMatchVaultPda,
	derivePlayerStatePda,
	deriveRewardVaultAuthorityPda,
	deriveRewardVaultPda,
	fundWallet,
	formatPublicKey,
	getPlayerAta,
	loadProgram,
	mintGameTokens,
	sharedAccounts,
} from "./shared";

async function main() {
	const { provider, program } = loadProgram();
	const gameConfig = deriveGameConfigPda();
	const config = await program.account.gameConfig.fetch(gameConfig);
	const tokenMint = config.tokenMint;

	const creator = provider.wallet.publicKey;
	const opponent = createEphemeralPlayer();

	await fundWallet(provider, creator, LAMPORTS_PER_SOL);
	await fundWallet(provider, opponent.publicKey, LAMPORTS_PER_SOL / 5);

	const creatorAta = await getPlayerAta(provider, tokenMint, creator);
	const opponentAta = await getPlayerAta(provider, tokenMint, opponent.publicKey);

	await mintGameTokens(provider, tokenMint, creatorAta.address, 500n);
	await mintGameTokens(provider, tokenMint, opponentAta.address, 500n);

	const matchId = new BN(config.nextMatchId);
	const matchAccount = deriveMatchPda(matchId);
	const actionLog = deriveActionLogPda(matchId);
	const checkpoint = deriveCheckpointPda(matchId);
	const matchVault = deriveMatchVaultPda(matchId);
	const rewardVault = deriveRewardVaultPda(matchId);
	const matchVaultAuthority = deriveMatchVaultAuthorityPda(matchId);
	const rewardVaultAuthority = deriveRewardVaultAuthorityPda(matchId);
	const creatorPlayerState = derivePlayerStatePda(matchAccount, creator);
	const opponentPlayerState = derivePlayerStatePda(matchAccount, opponent.publicKey);

	await program.methods
		.createMatch({ initialRewardPool: new BN(120) })
		.accountsPartial({
			creator,
			gameConfig,
			matchAccount,
			actionLog,
			checkpoint,
			matchVault,
			rewardVault,
			matchVaultAuthority,
			rewardVaultAuthority,
			creatorTokenAccount: creatorAta.address,
			tokenMint,
			tokenProgram: sharedAccounts.tokenProgram,
			systemProgram: sharedAccounts.systemProgram,
			rent: sharedAccounts.rent,
		})
		.rpc();

	await program.methods
		.joinMatch(0)
		.accountsPartial({
			player: creator,
			gameConfig,
			matchAccount,
			actionLog,
			playerState: creatorPlayerState,
			systemProgram: sharedAccounts.systemProgram,
		})
		.rpc();

	await program.methods
		.joinMatch(1)
		.accountsPartial({
			player: opponent.publicKey,
			gameConfig,
			matchAccount,
			actionLog,
			playerState: opponentPlayerState,
			systemProgram: sharedAccounts.systemProgram,
		})
		.signers([opponent])
		.rpc();

	await program.methods
		.startMatch()
		.accountsPartial({
			authority: creator,
			gameConfig,
			matchAccount,
			actionLog,
			checkpoint,
		})
		.rpc();

	await program.methods
		.deployUnit(0, 0)
		.accountsPartial({
			player: creator,
			gameConfig,
			matchAccount,
			playerState: creatorPlayerState,
			actionLog,
			playerTokenAccount: creatorAta.address,
			matchVault,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.rpc();

	await program.methods
		.deployUnit(1, 1)
		.accountsPartial({
			player: creator,
			gameConfig,
			matchAccount,
			playerState: creatorPlayerState,
			actionLog,
			playerTokenAccount: creatorAta.address,
			matchVault,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.rpc();

	await program.methods
		.buildTower(0, 0, 0)
		.accountsPartial({
			player: opponent.publicKey,
			gameConfig,
			matchAccount,
			playerState: opponentPlayerState,
			actionLog,
			playerTokenAccount: opponentAta.address,
			matchVault,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.signers([opponent])
		.rpc();

	await program.methods
		.buildTower(1, 2, 1)
		.accountsPartial({
			player: creator,
			gameConfig,
			matchAccount,
			playerState: creatorPlayerState,
			actionLog,
			playerTokenAccount: creatorAta.address,
			matchVault,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.rpc();

	await program.methods
		.deployUnit(0, 2)
		.accountsPartial({
			player: opponent.publicKey,
			gameConfig,
			matchAccount,
			playerState: opponentPlayerState,
			actionLog,
			playerTokenAccount: opponentAta.address,
			matchVault,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.signers([opponent])
		.rpc();

	await program.methods
		.advanceTick(65)
		.accountsPartial({
			tickAuthority: creator,
			gameConfig,
			matchAccount,
			actionLog,
			checkpoint,
			rewardVault,
			rewardVaultAuthority,
			tokenProgram: sharedAccounts.tokenProgram,
		})
		.remainingAccounts([
			{ pubkey: creatorAta.address, isWritable: true, isSigner: false },
			{ pubkey: opponentAta.address, isWritable: true, isSigner: false },
		])
		.rpc();

	const matchState = await program.account.matchAccount.fetch(matchAccount);
	const actionLogState = await program.account.actionLog.fetch(actionLog);

	console.log(JSON.stringify({
		matchId: matchId.toString(),
		matchAccount: formatPublicKey(matchAccount),
		creator: formatPublicKey(creator),
		opponent: formatPublicKey(opponent.publicKey),
		matchPhase: matchState.phase,
		tick: matchState.currentTick.toString(),
		fortressHp: matchState.fortressHp.map((value: BN) => value.toString()),
		pendingSpawns: matchState.pendingSpawns.length,
		units: matchState.units.length,
		towers: matchState.towers.length,
		actionsRecorded: actionLogState.records.length,
		tokenMint: formatPublicKey(tokenMint),
		unitCatalog: defaultConfigArgs.unitKinds.length,
	}, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
