---
name: magicblock-comprehensive
description: Consolidated MagicBlock Ephemeral Rollups instructions for Solana development. Includes delegation and undelegation flows, dual-connection architecture, cranks, VRF, TypeScript and Anchor integration, environment setup, versions, program IDs, dependencies, gotchas, and reference links.
---

# Comprehensive MagicBlock Instructions

This document consolidates all guidance from the MagicBlock skill folder into a single reference while preserving the original technical details.

## What this is for

Use this reference when working on:
- MagicBlock Ephemeral Rollups integration
- Delegating and undelegating Solana accounts to ephemeral rollups
- High-performance, low-latency transaction flows
- Crank scheduling for recurring automated transactions
- VRF (Verifiable Random Function) for provable randomness
- Dual-connection architecture spanning the base layer and ephemeral rollup
- Gaming and real-time app development on Solana

## Core Concepts

### Ephemeral Rollups

Ephemeral Rollups enable high-performance, low-latency transactions by temporarily delegating Solana account ownership to an ephemeral rollup. They are ideal for gaming, real-time apps, and fast transaction throughput.

### Delegation

Delegation transfers account ownership from your program to the delegation program, allowing the ephemeral rollup to process transactions at approximately 10-50ms latency versus approximately 400ms on the base layer.

### Architecture

```text
┌─────────────────┐     delegate      ┌─────────────────────┐
│   Base Layer    │ ───────────────►  │  Ephemeral Rollup   │
│    (Solana)     │                   │    (MagicBlock)     │
│                 │  ◄─────────────── │                     │
└─────────────────┘    undelegate     └─────────────────────┘
     ~400ms                                  ~10-50ms
```

## Default Stack Decisions (Opinionated)

1. Programs: Anchor with `ephemeral-rollups-sdk`
   - Use `ephemeral-rollups-sdk` with Anchor features.
   - Apply `#[ephemeral]` before `#[program]`.
   - Use `#[delegate]` and `#[commit]` macros for delegation contexts.

2. Dual connections
   - Use the base layer connection for initialization and delegation.
   - Use the ephemeral rollup connection for operations on delegated accounts.

3. Transaction routing
   - Delegate transactions go to the base layer.
   - Operations on delegated accounts go to the ephemeral rollup.
   - Undelegate and commit transactions go to the ephemeral rollup.

## Operating Procedure

### 1. Classify the operation type

- Account initialization (base layer)
- Delegation (base layer)
- Operations on delegated accounts (ephemeral rollup)
- Commit state (ephemeral rollup)
- Undelegation (ephemeral rollup)

### 2. Pick the right connection

- Base layer: `https://api.devnet.solana.com` (or mainnet)
- Ephemeral rollup: `https://devnet.magicblock.app/`

### 3. Implement with MagicBlock-specific correctness

Always be explicit about:
- Which connection to use for each transaction
- Delegation status checks before operations
- PDA seeds matching between delegate call and account definition
- Using `skipPreflight: true` for ER transactions
- Waiting for state propagation after delegate and undelegate

### 4. Add appropriate features

- Cranks for recurring automated transactions
- VRF for verifiable randomness in games and lotteries

### 5. Deliverables expectations

When implementing changes, provide:
- Exact files changed and diffs
- Commands to install, build, and test
- Risk notes for anything touching delegation, signing, or state commits

## Environment Variables

```bash
EPHEMERAL_PROVIDER_ENDPOINT=https://devnet.magicblock.app/
EPHEMERAL_WS_ENDPOINT=wss://devnet.magicblock.app/
ROUTER_ENDPOINT=https://devnet-router.magicblock.app/
WS_ROUTER_ENDPOINT=wss://devnet-router.magicblock.app/
```

## Version Requirements

| Software | Version |
|----------|---------|
| Solana | 2.3.13 |
| Rust | 1.85.0 |
| Anchor | 0.32.1 |
| Node | 24.10.0 |

## Key Program IDs

| Program | Address |
|---------|---------|
| Delegation Program | `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh` |
| Magic Program | `Magic11111111111111111111111111111111111111` |
| Magic Context | `MagicContext1111111111111111111111111111111` |
| Localnet Validator | `mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev` |

## Rust Dependencies

```toml
[dependencies]
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
ephemeral-rollups-sdk = { version = "0.6.5", features = ["anchor", "disable-realloc"] }

# For cranks
magicblock-magic-program-api = { version = "0.3.1", default-features = false }
bincode = "^1.3"
sha2 = "0.10"

# For VRF
ephemeral-vrf-sdk = { version = "0.2.1", features = ["anchor"] }
```

## NPM Dependencies

```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@magicblock-labs/ephemeral-rollups-sdk": "^0.6.5"
  }
}
```

## Delegation Patterns (Rust Programs)

### Rust Program Setup

#### Dependencies

```toml
# Cargo.toml
[dependencies]
anchor-lang = { version = "0.32.1", features = ["init-if-needed"] }
ephemeral-rollups-sdk = { version = "0.6.5", features = ["anchor", "disable-realloc"] }
```

#### Imports

```rust
use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};
```

#### Program Macros

```rust
#[ephemeral]  // REQUIRED: Add before #[program]
#[program]
pub mod my_program {
    // ...
}
```

### Delegate Instruction

```rust
pub fn delegate(ctx: Context<DelegateInput>, uid: String) -> Result<()> {
    // Method name is `delegate_<field_name>` based on the account field
    ctx.accounts.delegate_my_account(
        &ctx.accounts.payer,
        &[b"seed", uid.as_bytes()],  // PDA seeds
        DelegateConfig::default(),
    )?;
    Ok(())
}

#[delegate]  // Adds delegation accounts automatically
#[derive(Accounts)]
#[instruction(uid: String)]
pub struct DelegateInput<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: The PDA to delegate
    #[account(mut, del, seeds = [b"seed", uid.as_bytes()], bump)]
    pub my_account: AccountInfo<'info>,  // Use AccountInfo with `del` constraint
}
```

### Undelegate Instruction

```rust
pub fn undelegate(ctx: Context<Undelegate>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.my_account.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}

#[commit]  // Adds magic_context and magic_program automatically
#[derive(Accounts)]
pub struct Undelegate<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,
}
```

### Commit Without Undelegating

```rust
pub fn commit(ctx: Context<CommitState>) -> Result<()> {
    commit_accounts(
        &ctx.accounts.payer,
        vec![&ctx.accounts.my_account.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
    )?;
    Ok(())
}
```

### Common Gotchas

#### Method Name Convention

The delegate method is auto-generated as `delegate_<field_name>`:

```rust
pub my_account: AccountInfo<'info>,  // => ctx.accounts.delegate_my_account()
```

#### PDA Seeds Must Match

Seeds in the delegate instruction must exactly match the account definition:

```rust
#[account(mut, del, seeds = [b"tomo", uid.as_bytes()], bump)]
pub tomo: AccountInfo<'info>,

// Delegate call - seeds must match
ctx.accounts.delegate_tomo(&payer, &[b"tomo", uid.as_bytes()], config)?;
```

#### Account Owner Changes on Delegation

```text
Not delegated: account.owner == YOUR_PROGRAM_ID
Delegated:     account.owner == DELEGATION_PROGRAM_ID
```

### Best Practices

#### Do's

- Always use `skipPreflight: true` for faster transactions because the ephemeral rollup handles validation.
- Use dual connections: base layer for delegate, ephemeral rollup for operations and undelegate.
- Verify delegation status with `accountInfo.owner.equals(DELEGATION_PROGRAM_ID)`.
- Wait for state propagation. Add a 3 second sleep after delegate and undelegate in tests before proceeding to the next step.
- Use `GetCommitmentSignature` to verify commits reached the base layer.

#### Don'ts

- Do not send delegate transactions to the ephemeral rollup. Delegation always goes to the base layer.
- Do not send operations to the base layer. Delegated account operations go to the ephemeral rollup.
- Do not forget the `#[ephemeral]` macro. It is required on the program module.
- Do not use `Account<>` in a delegate context. Use `AccountInfo` with the `del` constraint.
- Do not skip the `#[commit]` macro. It is required for the undelegate context.

## TypeScript Frontend Setup

### Dependencies

```json
{
  "dependencies": {
    "@coral-xyz/anchor": "^0.32.1",
    "@magicblock-labs/ephemeral-rollups-sdk": "^0.6.5"
  }
}
```

### Imports

```typescript
import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
} from "@magicblock-labs/ephemeral-rollups-sdk";
```

### Dual Connections

```typescript
// Base layer connection (Solana devnet/mainnet)
const baseConnection = new Connection("https://api.devnet.solana.com");

// Ephemeral rollup connection
const erConnection = new Connection(
  process.env.EPHEMERAL_PROVIDER_ENDPOINT || "https://devnet.magicblock.app/",
  { wsEndpoint: process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet.magicblock.app/" }
);
```

### Transaction Flow Summary

| Action | Send To | Provider |
|--------|---------|----------|
| Initialize account | Base Layer | `provider` |
| Delegate | Base Layer | `provider` |
| Operations on delegated | Ephemeral Rollup | `providerER` |
| Commit (keep delegated) | Ephemeral Rollup | `providerER` |
| Undelegate | Ephemeral Rollup | `providerER` |

### Check Delegation Status

```typescript
function checkIsDelegated(accountOwner: PublicKey): boolean {
  return accountOwner.equals(DELEGATION_PROGRAM_ID);
}

const accountInfo = await connection.getAccountInfo(pda);
const isDelegated = checkIsDelegated(accountInfo.owner);
```

### Delegate Transaction (Base Layer)

```typescript
async function buildDelegateTx(payer: PublicKey, uid: string): Promise<Transaction> {
  const instruction = await program.methods
    .delegate(uid)
    .accounts({ payer })
    .instruction();

  const tx = new Transaction().add(instruction);
  tx.feePayer = payer;
  return tx;
}

// Send to BASE LAYER
const txHash = await baseProvider.sendAndConfirm(tx, [], {
  skipPreflight: true,
  commitment: "confirmed",
});
```

### Execute on Delegated Account (Ephemeral Rollup)

```typescript
let tx = await program.methods
  .myInstruction()
  .accounts({ myAccount: pda })
  .transaction();

// CRITICAL: Use ephemeral rollup connection
tx.feePayer = erProvider.wallet.publicKey;
tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
tx = await erProvider.wallet.signTransaction(tx);

const txHash = await erProvider.sendAndConfirm(tx, [], { skipPreflight: true });
```

### Undelegate Transaction (Ephemeral Rollup)

```typescript
async function buildUndelegateTx(payer: PublicKey, pda: PublicKey): Promise<Transaction> {
  const instruction = await program.methods
    .undelegate()
    .accounts({
      payer,
      myAccount: pda,
      magicProgram: new PublicKey("Magic11111111111111111111111111111111111111"),
      magicContext: new PublicKey("MagicContext1111111111111111111111111111111"),
    })
    .instruction();

  const tx = new Transaction().add(instruction);
  tx.feePayer = payer;
  return tx;
}

// Send to EPHEMERAL ROLLUP
const txHash = await erProvider.sendAndConfirm(tx, [], { skipPreflight: true });

// Wait for commitment on base layer
const commitTxHash = await GetCommitmentSignature(txHash, erConnection);
```

### Key Program IDs

```typescript
const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
const MAGIC_PROGRAM_ID = new PublicKey("Magic11111111111111111111111111111111111111");
const MAGIC_CONTEXT_ID = new PublicKey("MagicContext1111111111111111111111111111111");
const LOCALNET_VALIDATOR = new PublicKey("mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev");
```

### Localnet Requires Validator Identity

```typescript
const remainingAccounts = endpoint.includes("localhost")
  ? [{ pubkey: LOCALNET_VALIDATOR, isSigner: false, isWritable: false }]
  : [];
```

### React Native Buffer Issues

Anchor's `program.account.xxx.fetch()` may fail in React Native. In that case, manually decode the account:

```typescript
const accountInfo = await connection.getAccountInfo(pda);
const isDelegated = accountInfo.owner.equals(DELEGATION_PROGRAM_ID);
const data = manuallyDecodeAccount(accountInfo.data);
```

## Cranks (Scheduled Tasks)

Cranks enable automatic, recurring transactions on ephemeral rollups without external infrastructure.

### Additional Dependencies

```toml
[dependencies]
magicblock-magic-program-api = { version = "0.3.1", default-features = false }
bincode = "^1.3"
sha2 = "0.10"
```

### Crank Imports

```rust
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke_signed,
};
use ephemeral_rollups_sdk::consts::MAGIC_PROGRAM_ID;
use magicblock_magic_program_api::{args::ScheduleTaskArgs, instruction::MagicBlockInstruction};
```

### Crank Arguments

```rust
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ScheduleCrankArgs {
    pub task_id: u64,                    // Unique task identifier
    pub execution_interval_millis: u64,  // Milliseconds between executions
    pub iterations: u64,                 // Number of times to execute
}
```

### Schedule Crank Instruction

```rust
pub fn schedule_my_crank(ctx: Context<ScheduleCrank>, args: ScheduleCrankArgs) -> Result<()> {
    let crank_ix = Instruction {
        program_id: crate::ID,
        accounts: vec![AccountMeta::new(ctx.accounts.my_account.key(), false)],
        data: anchor_lang::InstructionData::data(&crate::instruction::MyCrankInstruction {}),
    };

    let ix_data = bincode::serialize(&MagicBlockInstruction::ScheduleTask(ScheduleTaskArgs {
        task_id: args.task_id,
        execution_interval_millis: args.execution_interval_millis,
        iterations: args.iterations,
        instructions: vec![crank_ix],
    })).map_err(|_| ProgramError::InvalidArgument)?;

    let schedule_ix = Instruction::new_with_bytes(
        MAGIC_PROGRAM_ID,
        &ix_data,
        vec![
            AccountMeta::new(ctx.accounts.payer.key(), true),
            AccountMeta::new(ctx.accounts.my_account.key(), false),
        ],
    );

    invoke_signed(&schedule_ix, &[
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.my_account.to_account_info(),
    ], &[])?;

    Ok(())
}
```

### Client-Side Crank Scheduling

```typescript
import { MAGIC_PROGRAM_ID } from "@magicblock-labs/ephemeral-rollups-sdk";

// CRITICAL: Send to Ephemeral Rollup (not base layer)
const tx = await program.methods
  .scheduleMyCrank({
    taskId: new BN(1),
    executionIntervalMillis: new BN(100),
    iterations: new BN(10),
  })
  .accounts({
    magicProgram: MAGIC_PROGRAM_ID,
    payer: erProvider.wallet.publicKey,
    program: program.programId,
  })
  .transaction();
```

### Key Points

- Cranks run automatically on the ephemeral rollup.
- No external infrastructure is needed. No servers and no cron jobs are required.
- Schedule transactions must be sent to the ephemeral rollup, not the base layer.
- `task_id` must be unique per scheduled task.
- `execution_interval_millis` controls timing between executions.
- `iterations` controls how many times the task runs.

## VRF (Verifiable Random Function)

VRF provides provably fair randomness for games, lotteries, and any application requiring verifiable randomness.

### Additional Dependencies

```toml
[dependencies]
ephemeral-vrf-sdk = { version = "0.2.1", features = ["anchor"] }
```

### VRF Imports

```rust
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;
```

### Request Randomness

```rust
pub fn request_randomness(ctx: Context<RequestRandomnessCtx>, client_seed: u8) -> Result<()> {
    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.payer.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: ID,
        callback_discriminator: instruction::ConsumeRandomness::DISCRIMINATOR.to_vec(),
        caller_seed: [client_seed; 32],
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.my_account.key(),
            is_signer: false,
            is_writable: true,
        }]),
        ..Default::default()
    });

    ctx.accounts.invoke_signed_vrf(&ctx.accounts.payer.to_account_info(), &ix)?;
    Ok(())
}

#[vrf]  // Required macro for VRF interactions
#[derive(Accounts)]
pub struct RequestRandomnessCtx<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(seeds = [MY_SEED, payer.key().to_bytes().as_slice()], bump)]
    pub my_account: Account<'info, MyAccount>,
    /// CHECK: Oracle queue
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_EPHEMERAL_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}
```

### Consume Randomness Callback

```rust
pub fn consume_randomness(ctx: Context<ConsumeRandomnessCtx>, randomness: [u8; 32]) -> Result<()> {
    let random_value = ephemeral_vrf_sdk::rnd::random_u8_with_range(&randomness, 1, 6);
    ctx.accounts.my_account.last_random = random_value;
    Ok(())
}

#[derive(Accounts)]
pub struct ConsumeRandomnessCtx<'info> {
    /// SECURITY: Validates callback is from VRF program
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub my_account: Account<'info, MyAccount>,
}
```

### Oracle Queue Constants

| Constant | Use Case |
|----------|----------|
| `DEFAULT_QUEUE` | Non-delegated programs (base layer) |
| `DEFAULT_EPHEMERAL_QUEUE` | Delegated programs (ephemeral rollup) |

### Key Points

- VRF provides cryptographically verifiable randomness.
- The callback pattern ensures randomness is delivered asynchronously.
- Always validate the `vrf_program_identity` signer in the callback to prevent spoofed randomness.
- Use `DEFAULT_EPHEMERAL_QUEUE` for delegated accounts on the ephemeral rollup.
- Use `DEFAULT_QUEUE` for non-delegated accounts on the base layer.
- `caller_seed` can be used to add entropy from the client side.

## Reference Links

- [MagicBlock Documentation](https://docs.magicblock.gg/)
- [MagicBlock Engine Examples](https://github.com/magicblock-labs/magicblock-engine-examples)
- [Ephemeral Rollups SDK (Rust)](https://crates.io/crates/ephemeral-rollups-sdk)
- [Ephemeral VRF SDK (Rust)](https://crates.io/crates/ephemeral-vrf-sdk)
- [NPM Package](https://www.npmjs.com/package/@magicblock-labs/ephemeral-rollups-sdk)

## Game-Specific Guidance For A Multiplayer Tug-Of-War Tower Defense Game

This section translates the MagicBlock patterns above into a concrete architecture for an onchain multiplayer game with two teams, up to three players per team, deterministic replay, and token-denominated gameplay actions.

### Recommended Framework And Language Choices

Use the following stack to satisfy the three weighted requirements:

1. Onchain game authority: Rust with Anchor.
   - Rust is the correct choice for deterministic state transitions, token custody, and low-level control over Solana accounts.
   - Anchor is the correct framework for account validation, IDLs, tests, and safer instruction development.

2. Fast real-time execution: MagicBlock Ephemeral Rollups with `ephemeral-rollups-sdk`.
   - Active match state should be delegated to MagicBlock during the match.
   - High-frequency gameplay instructions should execute on the ephemeral rollup.
   - Match checkpoints, settlements, and finalization should commit back to base layer.

3. Client, tooling, tests, and indexing: TypeScript.
   - Use TypeScript for the web client, Anchor client integration, local tools, deterministic replay tooling, and devnet scripts.
   - TypeScript gives the most direct compatibility with Anchor clients and MagicBlock SDKs.

4. Frontend rendering: TypeScript with Phaser.
   - This is a 2D lane-based tug-of-war and tower defense game, so Phaser is a pragmatic fit.
   - It allows deterministic visual replay from serialized onchain action records without introducing a second authoritative simulation.

5. Token standard: SPL Token.
   - Use a dedicated fungible mint for match economy accounting.
   - Use program-controlled vault PDAs and escrow-style settlement instead of trusting the client.

### Architecture Priorities Mapped To Your Objectives

#### Objective 1: Onchain payments and onchain rewards

Every economically meaningful action must settle through the program.

- Unit deployment must transfer tokens from the player's token account into a match vault PDA.
- Tower construction must transfer tokens from the player's token account into a match vault PDA.
- Unit kills must pay rewards from the match reward vault or escrow policy defined by the match rules.
- Tower destruction must pay rewards from the same controlled vault system.
- Fortress destruction must trigger final settlement logic onchain.

Never compute rewards offchain and never let clients self-claim arbitrary amounts. The program must derive all costs and rewards from immutable unit and tower definitions plus deterministic match rules.

#### Objective 2: Multiplayer tug-of-war with tower defense layers

The match must be authoritative onchain.

- Two teams per match.
- Up to three players per team.
- Shared lanes and shared tower slots per team.
- Shared fortress health per team.
- Players can deploy units, build towers, upgrade towers if enabled, and trigger team-allowed tactical actions.

Use team-scoped authority checks inside the program so a player can only spend from their own wallet but can only affect state for their assigned team and legal map positions.

#### Objective 3: Fully reconstructable onchain replay

The replay source of truth must be onchain data, not client logs.

- Every player action must write a canonical action record with a monotonic sequence number.
- Every simulation tick that changes state must be reproducible from prior state plus action records.
- Every asynchronous system action such as scheduled wave movement or tower attacks must also be recorded or derived deterministically from prior committed state and tick number.
- Final replay generation must be able to rebuild the match with full parity from genesis match state, game config, action log, and checkpoints.

Do not rely only on Anchor events for replay fidelity. Emit events for UX and indexing, but persist canonical replay data in accounts that remain queryable from chain state history.

### Recommended Onchain System Design

#### Programs

Use one primary Anchor program for the game.

Suggested modules:
- `config`: Global game balance, token mint, admin controls, season settings.
- `lobby`: Match creation, team join, ready checks, matchmaking hooks.
- `match_engine`: Match lifecycle, lane state, fortress state, win conditions.
- `economy`: Deposits, deployment costs, build costs, kill rewards, settlement.
- `actions`: Player instruction handlers and canonical action recording.
- `replay`: Action log append, checkpoints, replay integrity hashes.
- `magicblock`: Delegate, commit, undelegate, crank integration.

#### Core Accounts

Suggested PDA layout:

- `game_config`
  - Stores game-wide token mint, balance tables, treasury rules, admin authority, and version.

- `match`
  - Stores match id, phase, map id, fortress state, team state, tick counters, winner, and replay metadata.

- `team_state`
  - Stores roster, team fortress hp, team resource stats, lane control values, and aggregated counters.

- `player_state`
  - Stores player wallet, team assignment, contribution stats, reward totals, and anti-double-spend counters.

- `unit_instance`
  - Stores unit type, owner team, lane, hp, position, attack timers, and spawn tick.

- `tower_instance`
  - Stores tower type, owner team, lane or tile slot, hp, attack state, and build tick.

- `match_vault`
  - Program-owned token vault for costs paid during a match.

- `reward_vault`
  - Program-owned token vault used for kill rewards, tower destruction rewards, and end-of-match payouts.

- `action_log_page`
  - Stores append-only serialized action records in paginated chunks.

- `checkpoint`
  - Stores periodic snapshots of deterministic match state plus integrity hash.

- `unit_catalog` and `tower_catalog`
  - Stores immutable or versioned stat definitions and cost tables.

### Economic Design Requirements

#### Token Flow Rules

Use strict vault-based settlement.

- Player spends are transferred during the same instruction that creates the unit or tower action.
- Reward payouts are transferred during the same instruction that confirms the kill or destruction outcome.
- The match cannot promise rewards it cannot pay. The reward vault must be prefunded or costs collected must be sufficient under the configured reward schedule.

Recommended economic flow:

1. Match creation funds the reward vault.
2. Player deployments and builds fund the match vault.
3. Kill and destruction rewards are paid from reward policy accounts controlled by the program.
4. End-of-match settlement returns residual balances according to the configured rules.

#### Anti-Exploit Rules

- Only the program can determine whether a unit kill or tower destruction occurred.
- Payouts must be bound to the exact destroyed entity id and exact action or tick resolution.
- Each rewardable entity must have a consumed reward flag to prevent double payouts.
- Unit and tower costs must come from versioned config accounts so replay remains historically accurate.
- If balance tables change between seasons, old matches must continue using the config version they started with.

### Deterministic Replay Requirements

To achieve 100 percent parity, the simulation model must be deterministic.

#### Canonical Replay Inputs

The replay engine must only need:
- Initial match configuration.
- Exact unit and tower catalogs referenced by version.
- Team rosters.
- Ordered action log.
- Ordered crank or system actions if not purely deterministic.
- Periodic checkpoints for faster reconstruction.

#### Action Record Requirements

Each action record should include:
- Match id.
- Global sequence number.
- Tick number.
- Acting player.
- Team id.
- Action type.
- Action parameters.
- Pre-state hash or checkpoint reference if used.
- Post-state hash or resulting entity ids if needed for audit.
- Timestamp and slot metadata for indexing.

#### Replay Best Practices

- Use monotonic sequence numbers assigned by the program, not by the client.
- Use fixed-point integers only. Do not use floating point math anywhere in authoritative simulation.
- Use stable ordering rules whenever multiple entities resolve in the same tick.
- Record all manual player actions onchain.
- Record or deterministically derive all automated tower attacks, unit movement, projectile impacts, and fortress damage.
- Add checkpoint accounts every fixed number of ticks to reduce replay time without sacrificing determinism.

### How MagicBlock Should Be Used For This Game

Delegate active match accounts to the ephemeral rollup for live gameplay.

Suggested delegation targets:
- `match`
- active `team_state`
- active `player_state`
- active `unit_instance`
- active `tower_instance`
- current `action_log_page`
- checkpoint accounts being written during the match

Use the base layer for:
- Match creation
- Token mint and vault initialization
- Initial deposits
- Delegation transaction
- Final commit verification
- Post-match archival and season accounting

Use the ephemeral rollup for:
- Unit deployment
- Tower build and upgrade actions
- Tick advancement
- Tower attacks and unit combat resolution
- Action log appends
- Reward payouts during live play
- Match completion and undelegation trigger

### Crank Strategy For Real-Time Simulation

Use cranks to advance the authoritative simulation at a fixed tick interval.

Recommended pattern:
- A scheduled crank advances match ticks.
- Each tick resolves queued player actions in deterministic order.
- Each tick resolves automated combat, movement, projectile effects, and fortress damage.
- Each tick writes replay-critical outputs or enough deterministic state to recompute them exactly.

Do not depend on a centralized game server for authoritative state advancement. A read-only relay service is acceptable for UX, but authoritative progression must remain onchain.

### VRF Guidance

Avoid VRF in the core combat loop unless randomness is essential to design.

- If you want a purely skill-and-economy-driven tug-of-war game, do not use randomness for core attack resolution.
- If you want critical hits, random drops, or special events, use VRF and record the fulfilled randomness in replay records.
- Any VRF-derived effect must be written in a way that replay can consume the same randomness value and reproduce the same outcome.

### Recommended Client And Repository Structure

Suggested repository structure:

```text
programs/
  fortress_wars/
    src/
      lib.rs
      instructions/
      state/
      events/
      errors/
      math/
      replay/
      economy/
      magicblock/
tests/
  fortress-wars.spec.ts
  replay-parity.spec.ts
  economy-settlement.spec.ts
apps/
  web/
    src/
      game/
      replay/
      ui/
      wallet/
      lib/
scripts/
  devnet/
  replay/
  migration/
```

### Non-Negotiable Implementation Rules

- The onchain program is the sole authority for match state and payouts.
- Clients may propose actions, but clients never finalize outcomes.
- Match history must remain reconstructable from chain data alone.
- All cost and reward schedules must be versioned.
- Replay determinism is more important than visual convenience.
- Any feature that cannot be replayed exactly from chain data should not be part of authoritative gameplay.

## Source Coverage

This consolidated file incorporates the content of:
- `SKILL.md`
- `delegation.md`
- `typescript-setup.md`
- `cranks.md`
- `vrf.md`
- `resources.md`