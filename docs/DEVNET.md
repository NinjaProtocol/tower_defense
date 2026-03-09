# Devnet Runbook

## Prerequisites

- Solana CLI configured with a funded devnet wallet.
- Anchor CLI installed.
- Node dependencies installed with `npm install`.

## Deploy

```bash
npm run devnet:deploy
```

## Seed and sample match

```bash
npm run devnet:seed
npm run devnet:match
```

The seed step creates a new SPL mint and initializes the canonical game config if one does not already exist.

The sample match step funds a second ephemeral player on devnet, mints test tokens for both players, creates a match, joins both teams, starts the match, executes unit and tower actions, advances ticks, and prints the resulting match state and replay log size.

## Production readiness checklist

- Run `cargo check -p fortress_wars`.
- Run `npm test`.
- Run `npm run build:web`.
- Review the generated IDL under `target/idl/fortress_wars.json`.
- Fund the reward vault before live match testing.