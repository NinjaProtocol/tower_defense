# Core Instructions For Building The MagicBlock Onchain Game

## Repository Intent

This repository should serve as the canonical build guide for a multiplayer onchain game on Solana using MagicBlock Ephemeral Rollups. The target game is a tug-of-war style multiplayer strategy game with tower defense layers, onchain tokenized action costs and payouts, and replay reconstruction with full parity from onchain records.

## Product Definition

Build a match-based game where two teams compete to destroy the opposing fortress.

- Two teams per match.
- Up to three players per team.
- Players deploy units along shared paths.
- Players build defensive towers on approved tower slots.
- Towers defend lanes and fortresses.
- Units push toward the enemy fortress.
- The match ends when one fortress is destroyed or another deterministic win condition is reached.

## Highest-Priority Requirements

### 1. Onchain token economy

Every economically meaningful action must settle onchain.

- Deploying a unit costs tokens and must transfer tokens onchain.
- Killing a unit rewards tokens and must pay tokens onchain.
- Building a tower costs tokens and must transfer tokens onchain.
- Destroying a tower rewards tokens and must pay tokens onchain.
- Destroying the fortress must trigger final settlement onchain.

The client must never calculate or execute token settlement independently.

### 2. Multiplayer team combat

The game must support:

- Team A with one to three players.
- Team B with one to three players.
- Shared team objectives.
- Shared paths or lanes.
- Shared fortress defense.
- Shared construction zones and unit pressure.

### 3. Complete onchain replay fidelity

Every authoritative action must be reconstructable from onchain data.

- Player actions must be recorded onchain.
- System actions must be recorded or derived deterministically.
- Replay generation must be able to rebuild a match with full fidelity.
- The replay data must be sufficient to rebuild the match in any visual format.

## Mandatory Technology Choices

Use these choices unless a later constraint proves one of them impossible.

### Onchain program

- Language: Rust
- Framework: Anchor
- Rollup integration: `ephemeral-rollups-sdk`
- Token integration: SPL Token

Reason:
- Rust and Anchor provide deterministic state transitions, strong account validation, and first-class Solana tooling.
- MagicBlock is required for low-latency live match execution.
- SPL Token is the simplest and most interoperable way to enforce onchain costs and rewards.

### Client and tooling

- Language: TypeScript
- Anchor client for instruction building and tests
- MagicBlock TypeScript SDK integration for dual-connection flows
- Replay tooling in TypeScript so it shares serialization logic with the web client and tests

Reason:
- TypeScript is the shortest path to robust Solana client tooling, devnet scripts, replay validators, and a browser game client.

### Frontend game client

- Renderer: Phaser in TypeScript
- Wallet integration: Solana wallet adapter compatible flow
- UI: React if needed for menus, lobby, and match shell

Reason:
- The game is fundamentally a 2D deterministic lane strategy game. Phaser is a pragmatic renderer and is easier to keep visually aligned with authoritative onchain state than a heavier engine.

## Authoritative Architecture

### The onchain program is the game server

Treat the Anchor program plus MagicBlock execution environment as the authoritative game server.

- The client only submits intents.
- The program validates legal actions.
- The program mutates state.
- The program transfers tokens.
- The program records replay history.
- The program determines winners.

No privileged offchain service may decide gameplay outcomes.

### Active match execution on MagicBlock

Delegate active match accounts to MagicBlock during a live match.

Run these on the ephemeral rollup:
- unit deployment
- tower placement
- tower upgrades if enabled
- unit movement resolution
- tower targeting and attacks
- unit combat and deaths
- fortress damage
- action log append operations
- replay checkpoint generation
- end-of-match resolution before commit and undelegate

Run these on the base layer:
- game configuration setup
- match creation
- token mint and vault setup
- initial player deposits if used
- delegation instruction
- final commit verification
- archival and reward accounting after match completion

## Core Program Domains

Split the onchain program into domains even if it compiles as a single Anchor program.

### Config domain

Stores:
- game admin authority
- token mint
- season version
- unit catalog version
- tower catalog version
- reward tables
- lane and map presets

### Lobby domain

Stores:
- open match lobbies
- player registrations
- team assignments
- ready state
- match start preconditions

### Match engine domain

Stores and resolves:
- match phase
- tick number
- fortress health
- lane state
- entity ownership
- win conditions

### Economy domain

Handles:
- spend validation
- token transfers for unit deployment
- token transfers for tower construction
- kill rewards
- tower destruction rewards
- fortress destruction settlement
- treasury or residual handling

### Replay domain

Handles:
- action sequence numbering
- append-only action records
- checkpoint snapshots
- replay hashes
- match final replay summary

### MagicBlock domain

Handles:
- delegation
- commit-only flows
- commit-and-undelegate flows
- crank scheduling
- dual-connection correctness

## Required Account Model

At minimum, implement these account types.

### `game_config`

Must contain:
- mint address for match economy token
- current config version
- unit cost table references
- tower cost table references
- reward calculation policy
- treasury or reserve policy

### `match`

Must contain:
- match id
- config version
- map id
- team count
- current phase
- current tick
- winning team if finalized
- action sequence counter
- checkpoint counter
- delegation status metadata

### `team_state`

Must contain:
- team id
- roster of player pubkeys
- fortress hp
- lane pressure summary if used
- aggregate spend and reward counters

### `player_state`

Must contain:
- wallet pubkey
- match id
- team id
- total spent
- total rewarded
- action nonce or anti-replay counter

### `unit_instance`

Must contain:
- unit id
- unit catalog version
- unit type id
- owner team id
- lane id
- hp
- position in deterministic fixed-point or integer grid
- attack cooldown state
- spawn tick
- destroyed flag
- reward claimed flag

### `tower_instance`

Must contain:
- tower id
- tower catalog version
- tower type id
- owner team id
- slot id
- hp
- targeting state if needed
- build tick
- destroyed flag
- reward claimed flag

### `match_vault` and `reward_vault`

Must contain or be linked to:
- token mint
- PDA authority
- match association
- balance tracking metadata if useful for audits

### `action_log_page`

Must contain:
- page index
- match id
- ordered serialized action records
- first and last sequence in page
- integrity hash if used

### `checkpoint`

Must contain:
- match id
- checkpoint index
- tick number
- compressed deterministic snapshot or sufficient hash and summary

## Economic Rules

### Costs

Every deployment or build action must:

1. validate the actor belongs to the correct match and team
2. validate the action is legal for the current match phase
3. read the correct config version
4. compute the cost deterministically
5. transfer tokens to the correct vault
6. create or queue the gameplay action
7. append the action log record

### Rewards

Every reward event must:

1. validate that the destroyed entity was alive before this resolution
2. validate the reward was not previously paid
3. compute the reward deterministically from versioned tables
4. transfer the reward onchain
5. mark the entity reward as claimed
6. append the action log record or deterministic resolution record

### Settlement policy

Choose one of these models and keep it explicit in config:

1. Closed economy per match.
   - Player spends fund the reward pool.
   - Remaining balances are redistributed or burned per rules.

2. Sponsored reward pool.
   - A game-controlled reserve tops up kill and destruction rewards.
   - Match spends still transfer onchain for anti-spam and economic pressure.

Whichever model is chosen, document insolvency behavior and never allow payouts larger than the available authorized balance.

## Replay And Determinism Rules

### Canonical record design

Each action record must include:
- match id
- sequence number
- tick number
- slot or timestamp metadata
- actor pubkey or system actor id
- team id
- action type
- action parameters
- resulting entity ids if created
- deterministic config version references

### Deterministic simulation rules

- Use integer math only.
- No floating point.
- Resolve simultaneous actions with stable ordering.
- Use fixed update intervals for tick advancement.
- Use catalog versioning to keep historical matches replayable.
- Store enough data to rebuild the match without hidden client assumptions.

### What must be recorded directly

Record directly onchain:
- player unit deployment intents
- player tower build intents
- upgrades or special abilities if added
- match start
- match end
- payouts
- checkpoint creation

### What may be derived if deterministic

These may be derived during replay if the logic is purely deterministic from prior state:
- unit movement
- tower targeting
- tower fire timing
- projectile travel if modeled deterministically
- fortress damage ticks

If any of those systems become nondeterministic or depend on external timing, they must be explicitly recorded instead.

## Multiplayer Rules

### Team constraints

- Maximum three players per team.
- Players cannot switch teams after match start.
- A player can only spend from their own wallet.
- A player can only issue actions valid for their own team.

### Shared state constraints

- Towers defend team-owned lanes or slots.
- All tower slots must be deterministic and map-defined.
- Units must spawn only from legal team spawners.
- Fortress state must be shared at the team level, not duplicated per player.

## MagicBlock Usage Rules

### Delegation rules

- Delegate all active match accounts before the match starts.
- Do not send delegate instructions to the ephemeral rollup.
- Use the base layer for delegation.
- Wait for propagation before sending live-match actions to MagicBlock.

### Ephemeral execution rules

- Send live gameplay transactions to the ephemeral rollup.
- Use `skipPreflight: true` where appropriate for ER transactions.
- Keep base layer and ER providers separate in code.
- Verify ownership changes when debugging delegated accounts.

### Commit rules

- Commit checkpoints periodically during long matches.
- Commit final state at match end.
- Undelegate only after the final state and records are safe to finalize.
- Verify commitment signatures on base layer.

## Crank Design Rules

Use cranks for scheduled simulation advancement.

Recommended tick design:
- fixed interval tick, for example 100ms to 250ms depending on compute limits
- each tick resolves queued actions first
- then automated combat and movement
- then payouts from resolved destructions
- then replay outputs or checkpoints if required on that interval

Cranks must remain deterministic and idempotent within their expected resolution model.

## VRF Rules

Do not add randomness unless the design clearly needs it.

- Core lane combat should remain deterministic if possible.
- If randomness is added for special abilities or rare events, use VRF.
- Any VRF output used by the game must be persisted or made accessible to replay logic.
- Callback validation must verify the VRF signer identity.

## Recommended Repository Layout

```text
Anchor.toml
Cargo.toml
package.json
programs/
  fortress_wars/
    src/
      lib.rs
      instructions/
      state/
      economy/
      replay/
      magicblock/
      errors/
      math/
tests/
  fortress-wars.spec.ts
  replay-parity.spec.ts
  multiplayer.spec.ts
  settlement.spec.ts
apps/
  web/
    src/
      game/
      replay/
      components/
      wallet/
      lib/
scripts/
  devnet/
  replay/
  fixtures/
docs/
```

## Implementation Standards

- Minimize hidden state.
- Prefer explicit versioned config accounts.
- Keep account sizes predictable and paginated when logs grow.
- Use PDA naming that is stable and derivable from match ids and entity ids.
- Write TypeScript tests that validate both settlement correctness and replay parity.
- Treat replay parity failures as release blockers.

## Concise Implementation Plan

### Final reviewed plan

1. Define the deterministic game spec.
   - Freeze lane rules, tower slots, fortress rules, unit stats, and reward formulas before coding the full engine.

2. Implement the Anchor account model and config versioning.
   - Build `game_config`, `match`, `team_state`, `player_state`, entity accounts, vaults, log pages, and checkpoints.

3. Implement the economy layer first.
   - Ship token spend and payout instructions before combat complexity so costs and rewards are guaranteed correct from the start.

4. Implement lobby and match lifecycle.
   - Create matches, join teams, enforce max three players per team, start matches, and finalize them.

5. Implement action submission and canonical action logging.
   - Every player action must append a sequence-numbered record before replay tooling is considered complete.

6. Implement deterministic tick resolution.
   - Add unit movement, tower attacks, deaths, fortress damage, and stable tie-breaking.

7. Integrate MagicBlock delegation and cranks.
   - Delegate active match state, move live instructions to ER, and schedule tick advancement through cranks.

8. Add replay checkpoints and replay validator tooling.
   - Build a TypeScript replay runner that rebuilds matches from chain records and compares hashes against checkpoints.

9. Build the Phaser client and match UI.
   - Keep the client non-authoritative and render only from onchain state plus replay outputs.

10. Run a devnet vertical slice.
   - Deploy the program, mint the economy token, create a sample match, run a full 2v2 or 3v3 test, verify payouts, and validate replay parity from the recorded chain data.

11. Harden for release.
   - Add exploit tests, compute-budget tests, long-match log pagination tests, and failure recovery checks before broader devnet review.

## Plan Review Loop

Review round 1 improvements:
- Start with economy and logging before full combat so the highest-priority requirements are validated first.
- Add config versioning early so replay remains valid across balance changes.
- Add replay validator tooling before frontend polish so parity issues surface early.

Review round 2 improvements:
- Add checkpoint hashes to shorten replay validation time on devnet.
- Treat long-match pagination as a first-class concern instead of retrofitting logs later.
- Require a full devnet vertical slice before any broader content expansion.

Review round 3 result:
- No further improvements found without introducing speculative complexity.
- The plan is ordered correctly around economy correctness, deterministic replay, then live multiplayer performance.

## Devnet Review Exit Criteria

The implementation is ready for review on devnet only when all of the following are true:

- token spends for unit and tower creation settle onchain
- token rewards for kills and destruction settle onchain
- two-team multiplayer works with at least two human-controlled wallets
- delegated live gameplay executes through MagicBlock ER
- action history can rebuild a completed match with full parity
- final match state commits back to base layer successfully
- payout totals reconcile exactly with vault balances and config rules

## Non-Negotiable Rules For Future Work

- Do not move authoritative logic offchain for convenience.
- Do not add gameplay randomness without replay-safe handling.
- Do not ship features that cannot be reconstructed from onchain records.
- Do not let the UI define game truth.
- Do not change costs or rewards without config versioning.

## Development Updates Through Current Milestone

- Built the repository from an empty starting point into a complete Anchor, TypeScript, Phaser, and Vite workspace.
- Implemented the onchain program for config setup, match creation, team join, match start, unit deployment, tower construction, deterministic tick advancement, reward payout, checkpointing, and match settlement.
- Added a generated IDL and deploy artifact flow that now builds successfully with the local Anchor CLI toolchain after dependency compatibility fixes.
- Implemented shared TypeScript simulation and replay tooling that mirrors the deterministic combat model and validates parity through tests.
- Added a React plus Phaser frontend that renders live deterministic state from the shared engine.
- Added devnet scripts for deployment, config seeding, and scripted sample-match execution.
- Validated `npm run lint`, `npm test`, `npm run replay`, `npm run build`, `npm run build:web`, `npm run build:program`, and `anchor build` successfully.
- Identified the only previous deployment blocker as wallet funding and have now been provided a funded local devnet keypair for live deployment.
- Current milestone work extends the game theme toward Warcraft I style Humans versus Orcs, adds a dedicated frontend demo mode, and executes the devnet plan using the provided wallet.
- Phase 5 adds Warcraft audio plus terrain assets, SOC unit and building preview art, explicit top/middle/bottom lane controls, tower tile selection, and deterministic 60-second lane waves with queued paid-unit spawns.
- The onchain program now records and resolves queued lane spawns deterministically, and the devnet replay path has been verified against a real match with `72` onchain action records.
- Verified devnet Phase 5 match: match id `1`, match account `AiT94MkeG1sYvqhwb5Mq5PjZp3VwebVqSuK6waPP39D9`, action log `FTDtohvKWf71vtnkz6rQcuRPZrbSBhkNUDJaifXFMEJs`, replay parity confirmed.

## Repository File Summary

- `.github/instructions/CORE.instructions.md`: Canonical architecture, delivery rules, development status, and repository summary for this workspace.
- `.gitignore`: Excludes build output, local wallet material, dependency trees, and environment files from source control.
- `.keypair.local`: Local funded devnet wallet material provided for deployment automation.
- `Anchor.toml`: Anchor workspace and provider configuration for building and deploying the onchain program.
- `Cargo.toml`: Root Rust workspace definition and release profile tuning.
- `Cargo.lock`: Locked Rust dependency graph compatible with the installed Anchor and Solana toolchain.
- `README.md`: Top-level project overview, feature summary, and common build commands.
- `package.json`: Root JavaScript workspace scripts and shared dependencies.
- `package-lock.json`: Locked Node dependency graph for reproducible installs.
- `tsconfig.json`: Shared TypeScript compiler settings for tests, scripts, and client code.
- `docs/DEVNET.md`: Devnet runbook for deployment, seeding, and sample-match execution.
- `docs/DEVNET_P5_UPDATE_PLAN.md`: Phase 5 implementation plan covering assets, wave logic, and replay validation.
- `docs/DEVNET_P5_UPDATE.md`: Phase 5 completion summary with real devnet outputs and replay-view instructions.
- `programs/fortress_wars/Cargo.toml`: Onchain program crate definition and Anchor dependency configuration.
- `programs/fortress_wars/src/lib.rs`: Core Solana game program implementing economy, deterministic combat, replay data, and settlement.
- `scripts/devnet/deploy.ts`: Devnet deployment automation for building and deploying the compiled program.
- `scripts/devnet/seed.ts`: Initializes the mint and onchain game configuration on devnet.
- `scripts/devnet/run-sample-match.ts`: Executes a scripted devnet sample match end to end and prints resulting state.
- `scripts/devnet/shared.ts`: Shared devnet helpers for wallet resolution, PDA derivation, minting, transfers, and provider setup.
- `scripts/replay/rebuild-match.ts`: Reconstructs a match using the deterministic TypeScript replay model.
- `scripts/replay/replay-devnet-match.ts`: Fetches a devnet match, reconstructs it from onchain records, and verifies replay parity.
- `tests/fortress-wars.spec.ts`: Sanity-checks the base catalog and project assumptions.
- `tests/multiplayer.spec.ts`: Verifies the multiplayer roster model supports the required two teams of up to three players.
- `tests/replay-parity.spec.ts`: Confirms replay reconstruction matches manual simulation.
- `tests/settlement.spec.ts`: Verifies settlement splitting logic.
- `apps/web/index.html`: Web entry document for the frontend build.
- `apps/web/package.json`: Web workspace dependencies and scripts.
- `apps/web/tsconfig.json`: Web TypeScript project configuration.
- `apps/web/vite.config.ts`: Vite build configuration for the React and Phaser client.
- `apps/web/src/App.tsx`: Main application shell, demo-mode controls, and high-level client state composition.
- `apps/web/src/main.tsx`: React application entry point.
- `apps/web/src/styles.css`: Frontend theme and layout styling.
- `apps/web/src/components/ControlPanel.tsx`: Team-specific action controls for units, towers, demo execution, and tick advancement.
- `apps/web/src/components/MatchSidebar.tsx`: Sidebar status view for match state, recent actions, and theme context.
- `apps/web/src/game/GameCanvas.tsx`: React wrapper around the Phaser renderer.
- `apps/web/src/game/phaserScene.ts`: Phaser scene that renders the battlefield, fortresses, units, and towers.
- `apps/web/src/lib/catalog.ts`: Shared gameplay catalog and theme metadata for units, towers, and factions.
- `apps/web/src/lib/assets.ts`: Shared Warcraft and SOC asset paths used by the frontend.
- `apps/web/src/lib/magicblock.ts`: Dual-connection factory for Solana base layer and MagicBlock endpoints.
- `apps/web/src/lib/matchEngine.ts`: Shared deterministic simulation and replay logic used by the frontend and tests.
- `apps/web/src/lib/program.ts`: Shared client-side program id and PDA helpers.
- `apps/web/src/lib/types.ts`: Shared TypeScript types for engine state and actions.
