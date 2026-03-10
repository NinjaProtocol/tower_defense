# Devnet P5 Update

## Scope Completed

- Integrated Warcraft library audio for faction interaction sounds in the frontend.
- Integrated Warcraft terrain and map tile imagery into the lane battlefield presentation.
- Integrated SOC library unit and building preview art into the frontend for unit and tower visuals.
- Implemented top, middle, and bottom lane selection in the frontend.
- Added visible tower tile selection and lane-side build markers.
- Changed the deterministic engine and onchain program so each lane starts with a base unit and receives a new base wave every 60 ticks.
- Changed paid unit deployment into queued spawns that join the next lane wave for the chosen lane.
- Created a real devnet test match and verified deterministic replay reconstruction from onchain records.

## Devnet Outputs

- Program id: `4J8koywfHEzdv7o2DLE1xajsLsBG1BbQp1RxuJqNf7m4`
- Game config: `GzsXqtYp9Xx7M1EqqDhFxCgeB3XjcFVCei9tzbJVRXku`
- Token mint: `HoUcXBXmJ1aLfczHAfaXrwmzZHwuEXPTxBa5MxGE24SL`
- Verified Phase 5 match id: `1`
- Match account: `AiT94MkeG1sYvqhwb5Mq5PjZp3VwebVqSuK6waPP39D9`
- Action log account: `FTDtohvKWf71vtnkz6rQcuRPZrbSBhkNUDJaifXFMEJs`

## Verified Match Summary

- Match reached tick `24` and ended with Orcish Horde victory.
- Fortress HP ended at `[4, 0]`.
- Recorded `72` onchain action records.
- Replay verification succeeded against the live onchain match state.

## Commands Used

```bash
npm run devnet:deploy
npm run devnet:seed
npm run devnet:match
npm run replay:devnet -- 1
```

## How To View The Replay

1. Reconstruct the verified devnet test match from onchain records:

```bash
npm run replay:devnet -- 1
```

2. View a local deterministic replay snapshot for the same ruleset:

```bash
npm run replay
```

3. Open the production client preview and use the demo controls:

```bash
npm run preview --workspace web -- --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173/` and use the lane selector, tower-tile selector, queued unit buttons, and `Run Demo Match`.

## Review Status

- Reviewed the implementation plan and completed every requested instruction.
- Reviewed the resulting implementation for missing replay validation and corrected that by adding `replay:devnet` parity verification.
- No remaining blocking errors were found.
