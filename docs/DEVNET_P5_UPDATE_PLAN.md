# Devnet P5 Update Plan

## Goal

Implement Phase 5 gameplay and presentation updates using the provided asset libraries, create a real devnet test match whose onchain records can drive deterministic replay reconstruction, and leave clear instructions for viewing that replay.

## Requirements To Satisfy

1. Use Warcraft library `.wav` files for game sound effects.
2. Use Warcraft map and tile assets for map layout and terrain presentation.
3. Use SOC library unit and building art or model-derived previews for unit and building visuals.
4. Render a three-lane battlefield: top, middle, and bottom.
5. Allow players to choose the lane for purchased units.
6. Show tower build tiles around each lane.
7. Spawn one base unit per lane from match start through match end.
8. Spawn a new lane wave every 60 seconds.
9. Queue purchased units into the next lane wave for the chosen lane.
10. Create a devnet test match with onchain records.
11. Reconstruct the devnet match from those onchain records.
12. Update repository instructions and provide replay-view steps after completion.

## Implementation Plan

### Phase A: Asset-backed frontend

1. Expose the root `assets` library to the Vite app.
2. Create a shared asset map for Warcraft sounds and terrain, plus SOC faction visuals.
3. Update the Phaser battlefield to render Warcraft-inspired terrain, top/middle/bottom lanes, and tower tiles.
4. Update the UI to support lane selection and slot selection.
5. Add Warcraft sound effects for selection, deploy, build, and demo actions.

### Phase B: Deterministic lane-wave engine

1. Extend the shared TypeScript match engine with pending spawn queues.
2. Add initial base-lane spawns at match start.
3. Add recurring 60-tick waves for all lanes.
4. Spawn queued purchased units with the next scheduled lane wave.
5. Keep replay output deterministic with integer-only rules.

### Phase C: Onchain parity

1. Extend the Anchor program to track pending queued spawns.
2. Change paid unit deployment into lane-queueing instead of immediate unit spawn.
3. Spawn base-wave and queued units deterministically on match start and every 60 ticks.
4. Keep action logging sufficient for replay reconstruction.
5. Rebuild and redeploy on devnet after validating account-size safety.

### Phase D: Replay validation

1. Create a devnet test match that exercises multiple lanes and wave timing.
2. Fetch its onchain action log and match state.
3. Reconstruct the match offchain from those records.
4. Compare reconstructed state against onchain state.
5. Document replay-view instructions for future testers.

## Review Round 1

Improvement found:
- The plan needed an explicit lane-wave queue model so purchased units do not spawn immediately.

## Review Round 2

Improvement found:
- The plan needed explicit replay verification against real onchain records, not just local deterministic tests.

## Review Round 3

Improvement found:
- The plan needed asset exposure through Vite before frontend asset integration could be completed safely.

## Review Round 4

No further improvements found without adding speculative scope outside the requested instructions.

## Exit Criteria

- Three-lane battlefield rendered with Warcraft terrain and lane labels.
- Warcraft sound effects triggered in the game client.
- SOC faction visuals used for units and building cards.
- Onchain program queues purchased units into deterministic 60-second waves.
- Devnet test match created successfully.
- Replay script reconstructs the devnet match from onchain records.
- Repository instructions updated with the new milestone and replay steps.
