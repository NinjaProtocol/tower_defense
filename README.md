# Onchain Tower-Defense

> This is an experiment with magicblocks on the solana blockchain

The goal is to create an onchain tower defense game that keeps a record of state fully onchain

> This allows a game to be recreateable by anyone in any format (think commmunity apps)

The entire development and all files are open-source so the game can also be forked

> Initial idea behind concept

Been thinking about this with another game lazywars and now testing it out in a tower defense format

Moree thoughts: https://x.com/adidogCEO/status/2030686953591480435

> Initial 10 prompts to get setup and started all shared below

Not only is the source code shared but also all prompts that created the source code and model used

Feel free to take and make it better

### prompt_001 GPT 5.4

i want to create an onchain game with magic blocks, check contexted directory on how magic blocks works and create a comprehensive single instructions file that details everything in the folder, do not miss any detail, once complete review to make sure 100% parity with original documentation

### prompt_002 GPT 5.4

I want to build an onchain game using magic blocks, it will be a classic tug-of-war style mechanics game with layers of tower defense, here are the main objectives you must accomplish with 1 being the highest weight

1. every unit deployed cost tokens that must be paid onchain, every unit killed rewards tokens that are paid out onchain, every tower build cost tokens that must be paid onchain, every tower destroyed rewards tokens that are paid out onchain

2. the main objective of the game is to destroy the opposing team's fortress, players build towers to defend shared paths and send units to attack the other team's fortress, it is a multiplayer game and should have multiplayer support for two teams of up to three players on each side

3. every action must be recorded onchain, the history of actions onchain must be able to recreate a replay of a match with 100% parity, the onchain records serve as the game records and data to be able to fully rebuild the game in any format

use best practices for the priorities described above to determine what framework and languages to satisfy all conditions described above, add this to the COMPREHENSIVE_INSTRUCTIONS.md file created just now and write out detailed core instructions for this repository, this file is to be called COREinstructions.md and has been contexted

once complete, create a concise implementation plan for building the game to completion and run it on devnet for review

review your implementation plan once complete, are there improvements? repeat until no improvements are found

present for review once complete

### prompt_003 GPT 5.4

ive reviewed the core instructions and your next steps, build this game to completion end to end and do not stop until you are ready to deploy to production and test on devnet, upon completion produce a comprehensive summary of the build with every file accounted for and provided context for in a single sentence of its function, review the summary and confirm it is 100% parity with files in directory, present summary and next steps to configure for testing environment on devnet with production build

### prompt_004 GPT 5.4

a wallet has been funded for you with 10 devnet SOL and the keypair can be found within the contexted files, below are further instructions

> the theme of the game is the classic real time strategy game warcraft 1, one team will use peons as their builder/worker, the other team will use a peaseant, it will be the classic orcs vs humans theme for units and towers

> deploy to devnet using the wallet provided and use the integrated browser to test the build on devnet, create a test/demo mode on the frontend, test game mechanics and functions, repeat until fully functional and ready to test with users on devnet

> before beginning update core.instructions.md with the file summary and summary of all development updates to now, review core.instructions.MD and create a comprehensive DEVNET_DEPLOYMENT_PLAN.MD file

> review development plan for improvements and errors, if found, repeat until none found, upon completing the review of DEVNET_DEPLOYMENT_PLAN.MD proceed with plan end to end until fully complete