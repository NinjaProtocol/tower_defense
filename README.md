# Onchain Tower-Defense

This repository is an experiment with MagicBlock on the Solana blockchain.

The goal is to build an onchain tower-defense game that keeps its full game state and action history onchain. That makes the game replayable and reconstructable by anyone, in any format, including community-built clients and tools.

The full development process and repository contents are open source so the project can be studied, forked, and extended.

## Concept

The idea grew out of earlier thinking around another game, LazyWars, and is now being tested in a tower-defense format.

More thoughts: https://x.com/adidogCEO/status/2030686953591480435

## Build History

The initial setup and direction for this project were driven by the exact prompts below. The source code is shared alongside the prompts and model used to produce it.

Feel free to take it and improve it.

### Prompt 001, GPT-5.4

i want to create an onchain game with magic blocks, check contexted directory on how magic blocks works and create a comprehensive single instructions file that details everything in the folder, do not miss any detail, once complete review to make sure 100% parity with original documentation

### Prompt 002, GPT-5.4

I want to build an onchain game using magic blocks, it will be a classic tug-of-war style mechanics game with layers of tower defense, here are the main objectives you must accomplish with 1 being the highest weight

1. every unit deployed cost tokens that must be paid onchain, every unit killed rewards tokens that are paid out onchain, every tower build cost tokens that must be paid onchain, every tower destroyed rewards tokens that are paid out onchain

2. the main objective of the game is to destroy the opposing team's fortress, players build towers to defend shared paths and send units to attack the other team's fortress, it is a multiplayer game and should have multiplayer support for two teams of up to three players on each side

3. every action must be recorded onchain, the history of actions onchain must be able to recreate a replay of a match with 100% parity, the onchain records serve as the game records and data to be able to fully rebuild the game in any format

use best practices for the priorities described above to determine what framework and languages to satisfy all conditions described above, add this to the COMPREHENSIVE_INSTRUCTIONS.md file created just now and write out detailed core instructions for this repository, this file is to be called COREinstructions.md and has been contexted

once complete, create a concise implementation plan for building the game to completion and run it on devnet for review

review your implementation plan once complete, are there improvements? repeat until no improvements are found

present for review once complete

### Prompt 003, GPT-5.4

ive reviewed the core instructions and your next steps, build this game to completion end to end and do not stop until you are ready to deploy to production and test on devnet, upon completion produce a comprehensive summary of the build with every file accounted for and provided context for in a single sentence of its function, review the summary and confirm it is 100% parity with files in directory, present summary and next steps to configure for testing environment on devnet with production build

### Prompt 004, GPT-5.4

a wallet has been funded for you with 10 devnet SOL and the keypair can be found within the contexted files, below are further instructions

> the theme of the game is the classic real time strategy game warcraft 1, one team will use peons as their builder/worker, the other team will use a peaseant, it will be the classic orcs vs humans theme for units and towers

> deploy to devnet using the wallet provided and use the integrated browser to test the build on devnet, create a test/demo mode on the frontend, test game mechanics and functions, repeat until fully functional and ready to test with users on devnet

> before beginning update core.instructions.md with the file summary and summary of all development updates to now, review core.instructions.MD and create a comprehensive DEVNET_DEPLOYMENT_PLAN.MD file

> review development plan for improvements and errors, if found, repeat until none found, upon completing the review of DEVNET_DEPLOYMENT_PLAN.MD proceed with plan end to end until fully complete

### Prompt 005, GPT-5.4

next instructions:

1. there are two folders in the /assets library ive created for you, soc and warcraft, use the wav files from warcraft for sound effects in the game, use the map/tiles in warcraft for map tiles and layouts, use the models in the soc folder for units and buildings

2. the map should have three lanes, top/middle/bottom, players should be able to choose which lane to send units to, all three lanes have tiles around them that towers can be built on, all three lanes should have a minimum base 1x unit that spawns from the beginning of the game to the end of the gamel, new wave of units spawns every 60s at all three spawn locations, units purchased during this time spawn with the base unit that spawns per lane inside the lane of the user's choice

3. create a test match that creates onchain records on devnet, the replayer should be able to recreate the game fully with these onchain records

> create a comprehensive DEVNET_P5_UPDATE_PLAN.MD file for implementation of instructions above, review implementation plan, confirm all instructions are satisfied, repeat until is

> review development plan for improvements and errors, if found, repeat until none found, upon completing the review of DEVNET_P5_UPDATE.MD proceed with plan end to end until fully complete

> present instructions to view replay of test match upon completion with summary of implementation and update CORE.instructions.md with development updates