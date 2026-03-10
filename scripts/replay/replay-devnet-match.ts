import { strict as assert } from "node:assert";
import { PublicKey } from "@solana/web3.js";
import { defaultCatalog } from "../../apps/web/src/lib/catalog";
import { replayFromOnchainRecords } from "../../apps/web/src/lib/matchEngine";
import type { EngineConfig, OnchainReplayRecord, TeamId } from "../../apps/web/src/lib/types";
import { deriveActionLogPda, deriveGameConfigPda, deriveMatchPda, loadProgram } from "../devnet/shared";

function toEngineConfig(gameConfig: any): EngineConfig {
  return {
    fortressHealth: Number(gameConfig.fortressHealth),
    laneCount: gameConfig.laneCount,
    waveIntervalTicks: defaultCatalog.waveIntervalTicks,
    baseUnitKind: defaultCatalog.baseUnitKind,
    units: gameConfig.unitKinds.map((unit: any) => ({
      id: unit.id,
      label: defaultCatalog.units.find((entry) => entry.id === unit.id)?.label ?? `Unit ${unit.id}`,
      cost: Number(unit.cost),
      reward: Number(unit.reward),
      health: unit.health,
      damage: unit.damage,
      range: unit.range,
      speed: unit.speed,
      fortressDamage: unit.fortressDamage,
      cooldownTicks: unit.cooldownTicks,
    })),
    towers: gameConfig.towerKinds.map((tower: any) => ({
      id: tower.id,
      label: defaultCatalog.towers.find((entry) => entry.id === tower.id)?.label ?? `Tower ${tower.id}`,
      cost: Number(tower.cost),
      reward: Number(tower.reward),
      health: tower.health,
      damage: tower.damage,
      range: tower.range,
      attackCooldown: tower.attackCooldown,
    })),
  };
}

function normalizeUnits(units: any[]) {
  return units.map((unit) => ({
    owner: unit.owner.toBase58?.() ?? unit.owner,
    team: unit.team,
    lane: unit.lane,
    kind: unit.kind,
    position: unit.position,
    hp: unit.hp,
    cooldown: unit.cooldown,
    alive: unit.alive,
  }));
}

function normalizeTowers(towers: any[]) {
  return towers.map((tower) => ({
    owner: tower.owner.toBase58?.() ?? tower.owner,
    team: tower.team,
    lane: tower.lane,
    slot: tower.slot,
    kind: tower.kind,
    hp: tower.hp,
    cooldown: tower.cooldown,
    alive: tower.alive,
  }));
}

async function main() {
  const matchIdArg = process.argv[2];
  if (!matchIdArg) {
    throw new Error("Pass a match id, for example: npm run replay:devnet -- 0");
  }

  const matchId = Number(matchIdArg);
  const { program } = loadProgram();
  const gameConfigKey = deriveGameConfigPda();
  const gameConfig = await program.account.gameConfig.fetch(gameConfigKey);
  const config = toEngineConfig(gameConfig);

  const matchKey = deriveMatchPda(matchId);
  const actionLogKey = deriveActionLogPda(matchId);
  const matchState = await program.account.matchAccount.fetch(matchKey);
  const actionLog = await program.account.actionLog.fetch(actionLogKey);

  const players = matchState.players
    .map((player: PublicKey, index: number) => ({ player: player.toBase58(), team: matchState.playerTeams[index] as TeamId }))
    .filter((entry: { player: string; team: TeamId }) => entry.player !== PublicKey.default.toBase58() && entry.team <= 1);

  const records: OnchainReplayRecord[] = actionLog.records.map((record: any) => ({
    sequence: Number(record.sequence),
    tick: Number(record.tick),
    actor: record.actor.toBase58(),
    team: record.team === 255 ? -1 : record.team,
    actionType: record.actionType,
    primary: record.primary,
    secondary: record.secondary,
    amount: Number(record.amount),
  }));

  const replayed = replayFromOnchainRecords(config, players, records, matchId);

  assert.equal(replayed.tick, Number(matchState.currentTick));
  assert.deepEqual(replayed.fortressHp, matchState.fortressHp.map((value: any) => Number(value)));
  assert.deepEqual(normalizeUnits(replayed.units), normalizeUnits(matchState.units));
  assert.deepEqual(normalizeTowers(replayed.towers), normalizeTowers(matchState.towers));

  console.log(JSON.stringify({
    matchId,
    matchAccount: matchKey.toBase58(),
    actionLog: actionLogKey.toBase58(),
    tick: replayed.tick,
    fortressHp: replayed.fortressHp,
    units: replayed.units.length,
    towers: replayed.towers.length,
    records: records.length,
    replayVerified: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});