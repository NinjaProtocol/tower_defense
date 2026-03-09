import { defaultConfigArgs, createGameMint, deriveGameConfigPda, formatPublicKey, loadProgram, sharedAccounts } from "./shared";

async function main() {
	const { provider, program } = loadProgram();
	const gameConfig = deriveGameConfigPda();

	const existingConfig = await provider.connection.getAccountInfo(gameConfig);
	if (existingConfig) {
		const config = await program.account.gameConfig.fetch(gameConfig);
		console.log(JSON.stringify({
			status: "existing",
			gameConfig: formatPublicKey(gameConfig),
			tokenMint: formatPublicKey(config.tokenMint),
			authority: formatPublicKey(config.authority),
			nextMatchId: config.nextMatchId.toString(),
		}, null, 2));
		return;
	}

	const tokenMint = await createGameMint(provider);

	await program.methods
		.initializeGameConfig(defaultConfigArgs)
		.accountsPartial({
			authority: provider.wallet.publicKey,
			tokenMint,
			treasury: provider.wallet.publicKey,
			gameConfig,
			systemProgram: sharedAccounts.systemProgram,
		})
		.rpc();

	console.log(JSON.stringify({
		status: "initialized",
		gameConfig: formatPublicKey(gameConfig),
		tokenMint: formatPublicKey(tokenMint),
		authority: formatPublicKey(provider.wallet.publicKey),
	}, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
