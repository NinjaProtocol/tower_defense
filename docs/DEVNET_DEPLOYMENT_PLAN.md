# Devnet Deployment Plan

## Objective

Deploy the Fortress Wars onchain game to devnet using the provided funded wallet, validate the deployed program and scripted match flow, verify the frontend build through the integrated browser, and leave the repository ready for user-facing devnet testing.

## Scope

- Use the funded local wallet from `.keypair.local`.
- Build and deploy the Anchor program to devnet.
- Seed the onchain config and mint.
- Execute a scripted sample match on devnet.
- Add and validate a Warcraft I inspired Humans versus Orcs demo mode in the frontend.
- Test the production frontend build in the integrated browser.
- Confirm the repository remains buildable after all changes.

## Phase 1: Preparation

1. Update repository instructions with development status and file summary.
2. Add this deployment plan and review it for omissions and implementation risks.
3. Wire `.keypair.local` into the devnet helper layer so scripts do not depend on the active CLI wallet.
4. Ensure local wallet material is ignored by source control.

## Phase 2: Theme And Demo Mode

1. Apply the Warcraft I inspired Humans versus Orcs visual and gameplay theme in the frontend.
2. Use `Peon` for the Orc worker and `Peasant` for the Human worker role in the UI.
3. Add a dedicated demo mode that can run a scripted local match preview without a connected wallet.
4. Keep the demo deterministic so it stays aligned with replay expectations.

## Phase 3: Devnet Deployment

1. Build the Anchor program and regenerate the IDL and deploy artifact.
2. Deploy the program with the provided funded wallet.
3. Initialize the game config and mint on devnet.
4. Run the scripted sample match and record the resulting match id, action log size, and state summary.

## Phase 4: Browser Validation

1. Start the production or preview frontend locally.
2. Open the frontend in the integrated browser.
3. Validate that the Warcraft-themed demo mode loads correctly.
4. Validate key mechanics in the browser: unit deployment, tower build flow, tick advancement, replay-safe action updates, and demo reset.
5. Confirm the UI communicates devnet readiness and deployed program context.

## Phase 5: Final Validation

1. Re-run the repository lint, tests, replay command, and full build.
2. Confirm that deploy artifacts still exist and align with the program id.
3. Confirm that devnet scripts execute with the provided wallet path.
4. Capture any remaining non-blocking issues for later optimization only.

## Known Risks And Mitigations

- Wallet resolution risk: mitigated by deriving a runtime wallet file from `.keypair.local` and exporting it to Anchor automatically.
- Faucet dependency risk: mitigated by funding ephemeral test players from the provided funded wallet instead of requesting airdrops.
- Frontend parity risk: mitigated by continuing to use the shared deterministic TypeScript engine for demo mode.
- Toolchain compatibility risk: mitigated by locking dependency versions compatible with the installed Anchor and Solana toolchain.
- Bundle-size warning risk: acceptable for now because it does not block correctness or deployment, but can be improved later with code splitting.

## Review Round 1

Improvement found:
- Explicitly remove faucet dependency from the devnet sample match flow because faucet rate limits already blocked earlier deployment validation.

## Review Round 2

Improvement found:
- Require a browser validation step after deployment rather than treating deployment and UI validation as separate optional tasks.

## Review Round 3

Improvement found:
- Make the provided wallet path deterministic and automatic so instructions do not rely on manual shell exports.

## Review Round 4

No further improvements found without adding speculative scope.

## Success Criteria

- The Anchor program deploys on devnet with the provided wallet.
- The seed script initializes the game config and mint successfully.
- The sample match script executes on devnet and prints a valid resulting match summary.
- The production frontend build loads in the integrated browser.
- Demo mode behaves correctly for deployment, building, ticks, and match progression.
- Local lint, tests, replay, and build commands remain green after all changes.
