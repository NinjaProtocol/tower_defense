# Onchain Tower-Defense

This repository is an experiment with MagicBlock on the Solana blockchain.

The goal is to build an onchain tower-defense game that keeps its full game state and action history onchain. That makes the game replayable and reconstructable by anyone, in any format, including community-built clients and tools.

The full development process and repository contents are open source so the project can be studied, forked, and extended.

## Concept

The idea grew out of earlier thinking around another game, LazyWars, and is now being tested in a tower-defense format.

More thoughts: https://x.com/adidogCEO/status/2030686953591480435

## Build History

The initial setup and direction for this project were driven by the prompts below. The source code is shared alongside the prompts and model used to produce it.

Feel free to take it and improve it.

### Prompt 001, GPT-5.4

Create an onchain game with MagicBlock. Review the provided context directory on how MagicBlock works and create a single comprehensive instructions file that captures everything in the folder without missing any detail. Once complete, review it to ensure full parity with the original documentation.

### Prompt 002, GPT-5.4

Build an onchain game using MagicBlock with classic tug-of-war mechanics layered with tower-defense gameplay. The highest-priority objectives are:

1. Every unit deployed must cost tokens paid onchain. Every unit killed must reward tokens paid onchain. Every tower built must cost tokens paid onchain. Every tower destroyed must reward tokens paid out onchain.
2. The main objective is to destroy the opposing team's fortress. Players build towers to defend shared paths and send units to attack the enemy fortress. The game must support multiplayer with two teams of up to three players per side.
3. Every action must be recorded onchain. The onchain action history must support replay reconstruction with full parity so the game can be rebuilt in any format from onchain records alone.

Use best practices to choose the framework and languages that best satisfy those priorities. Add the result to `COMPREHENSIVE_INSTRUCTIONS.md`, then write the detailed core repository instructions in `COREinstructions.md`.

Once complete, create a concise implementation plan for building the game to completion and running it on devnet for review.

Review the implementation plan for improvements, repeat until no improvements remain, and then present it for review.

### Prompt 003, GPT-5.4

After reviewing the core instructions and next steps, build the game end to end and continue until it is ready for production deployment and devnet testing. Then produce a comprehensive build summary where every file is accounted for with a single-sentence explanation of its function. Review that summary to confirm full parity with the directory contents, then present the summary and the next steps needed to configure a production-style devnet testing environment.

### Prompt 004, GPT-5.4

A wallet has been funded with 10 devnet SOL and the keypair is available in the provided context. Additional instructions:

1. The theme of the game is inspired by Warcraft I. One team uses peons as builders or workers, the other uses peasants, and the overall unit and tower theme follows Humans versus Orcs.
2. Deploy to devnet using the provided wallet and test the build in the integrated browser. Create a frontend test or demo mode, test the game mechanics and functions, and repeat until the game is fully functional and ready for user testing on devnet.
3. Before beginning, update `core.instructions.md` with the file summary and development summary to date, then review it and create a comprehensive `DEVNET_DEPLOYMENT_PLAN.md`.
4. Review the deployment plan for improvements and errors. If issues are found, repeat until none remain, then execute the plan end to end.