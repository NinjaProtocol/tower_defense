import type {
  ActionRecord,
  BuildAction,
  DeploymentAction,
  EngineConfig,
  MatchSnapshot,
  TeamId,
  TowerInstance,
  UnitInstance,
} from "./types";

const TEAM_ZERO_START = 0;
const TEAM_ONE_START = 100;

function towerPosition(team: TeamId, slot: number): number {
  const base = 20 + slot * 15;
  return team === 0 ? base : 100 - base;
}

function nextSequence(snapshot: MatchSnapshot): number {
  return snapshot.actionLog.length === 0
    ? 0
    : snapshot.actionLog[snapshot.actionLog.length - 1].sequence + 1;
}

function logAction(snapshot: MatchSnapshot, record: Omit<ActionRecord, "sequence" | "tick">): void {
  snapshot.actionLog.push({
    sequence: nextSequence(snapshot),
    tick: snapshot.tick,
    ...record,
  });
}

function moveUnit(unit: UnitInstance, speed: number): void {
  unit.position = unit.team === 0
    ? Math.min(100, unit.position + speed)
    : Math.max(0, unit.position - speed);
}

function nearestEnemyUnit(snapshot: MatchSnapshot, team: TeamId, lane: number, origin: number, range: number): UnitInstance | undefined {
  return snapshot.units
    .filter((unit) => unit.alive && unit.team !== team && unit.lane === lane && Math.abs(unit.position - origin) <= range)
    .sort((left, right) => Math.abs(left.position - origin) - Math.abs(right.position - origin) || left.id - right.id)[0];
}

function nearestEnemyTower(snapshot: MatchSnapshot, team: TeamId, lane: number, origin: number, range: number): TowerInstance | undefined {
  return snapshot.towers
    .filter((tower) => tower.alive && tower.team !== team && tower.lane === lane && Math.abs(towerPosition(tower.team, tower.slot) - origin) <= range)
    .sort((left, right) => Math.abs(towerPosition(left.team, left.slot) - origin) - Math.abs(towerPosition(right.team, right.slot) - origin) || left.id - right.id)[0];
}

export function createMatchSnapshot(config: EngineConfig, players: Array<{ player: string; team: TeamId }>, matchId = 0): MatchSnapshot {
  return {
    matchId,
    phase: "live",
    tick: 0,
    laneCount: config.laneCount,
    fortressHp: [config.fortressHealth, config.fortressHealth],
    winnerTeam: null,
    players: players.map((entry) => entry.player),
    playerTeams: Object.fromEntries(players.map((entry) => [entry.player, entry.team])) as Record<string, TeamId>,
    units: [],
    towers: [],
    actionLog: [],
  };
}

export function deployUnit(snapshot: MatchSnapshot, config: EngineConfig, action: DeploymentAction): void {
  const definition = config.units.find((unit) => unit.id === action.unitKind);
  if (!definition) {
    throw new Error(`Unknown unit kind ${action.unitKind}`);
  }
  snapshot.units.push({
    id: snapshot.units.length,
    owner: action.actor,
    team: action.team,
    lane: action.lane,
    kind: action.unitKind,
    position: action.team === 0 ? TEAM_ZERO_START : TEAM_ONE_START,
    hp: definition.health,
    cooldown: 0,
    alive: true,
  });
  logAction(snapshot, {
    actor: action.actor,
    team: action.team,
    actionType: "unit_deployed",
    primary: action.lane,
    secondary: action.unitKind,
    amount: definition.cost,
  });
}

export function buildTower(snapshot: MatchSnapshot, config: EngineConfig, action: BuildAction): void {
  const definition = config.towers.find((tower) => tower.id === action.towerKind);
  if (!definition) {
    throw new Error(`Unknown tower kind ${action.towerKind}`);
  }
  snapshot.towers.push({
    id: snapshot.towers.length,
    owner: action.actor,
    team: action.team,
    lane: action.lane,
    slot: action.slot,
    kind: action.towerKind,
    hp: definition.health,
    cooldown: 0,
    alive: true,
  });
  logAction(snapshot, {
    actor: action.actor,
    team: action.team,
    actionType: "tower_built",
    primary: action.lane,
    secondary: action.towerKind * 256 + action.slot,
    amount: definition.cost,
  });
}

export function advanceTick(snapshot: MatchSnapshot, config: EngineConfig, tickAuthority = "system"): void {
  if (snapshot.phase !== "live") {
    return;
  }
  snapshot.tick += 1;

  for (const tower of snapshot.towers.filter((entry) => entry.alive).sort((left, right) => left.id - right.id)) {
    if (tower.cooldown > 0) {
      tower.cooldown -= 1;
      continue;
    }
    const towerDefinition = config.towers.find((entry) => entry.id === tower.kind)!;
    const target = nearestEnemyUnit(snapshot, tower.team, tower.lane, towerPosition(tower.team, tower.slot), towerDefinition.range);
    if (!target) {
      continue;
    }
    target.hp = Math.max(0, target.hp - towerDefinition.damage);
    tower.cooldown = towerDefinition.attackCooldown;
    if (target.hp === 0 && target.alive) {
      target.alive = false;
      const reward = config.units.find((entry) => entry.id === target.kind)!.reward;
      logAction(snapshot, {
        actor: tower.owner,
        team: tower.team,
        actionType: "unit_killed",
        primary: target.id,
        secondary: 0,
        amount: reward,
      });
    }
  }

  for (const unit of snapshot.units.filter((entry) => entry.alive).sort((left, right) => left.id - right.id)) {
    if (unit.cooldown > 0) {
      unit.cooldown -= 1;
    }
    const unitDefinition = config.units.find((entry) => entry.id === unit.kind)!;
    const targetTower = nearestEnemyTower(snapshot, unit.team, unit.lane, unit.position, unitDefinition.range);
    if (targetTower && unit.cooldown === 0) {
      targetTower.hp = Math.max(0, targetTower.hp - unitDefinition.damage);
      unit.cooldown = unitDefinition.cooldownTicks;
      if (targetTower.hp === 0 && targetTower.alive) {
        targetTower.alive = false;
        const reward = config.towers.find((entry) => entry.id === targetTower.kind)!.reward;
        logAction(snapshot, {
          actor: unit.owner,
          team: unit.team,
          actionType: "tower_destroyed",
          primary: targetTower.id,
          secondary: 0,
          amount: reward,
        });
      }
      continue;
    }

    const enemyTeam: TeamId = unit.team === 0 ? 1 : 0;
    const atFortress = unit.team === 0 ? unit.position >= 100 : unit.position <= 0;
    if (atFortress && unit.cooldown === 0) {
      snapshot.fortressHp[enemyTeam] = Math.max(0, snapshot.fortressHp[enemyTeam] - unitDefinition.fortressDamage);
      unit.cooldown = unitDefinition.cooldownTicks;
      logAction(snapshot, {
        actor: unit.owner,
        team: unit.team,
        actionType: "fortress_hit",
        primary: enemyTeam,
        secondary: unit.id,
        amount: unitDefinition.fortressDamage,
      });
      if (snapshot.fortressHp[enemyTeam] === 0) {
        snapshot.phase = "finished";
        snapshot.winnerTeam = unit.team;
        break;
      }
      continue;
    }

    moveUnit(unit, unitDefinition.speed);
  }

  logAction(snapshot, {
    actor: tickAuthority,
    team: -1,
    actionType: "tick_advanced",
    primary: 0,
    secondary: 0,
    amount: snapshot.tick,
  });
}

export function replayFromActions(config: EngineConfig, players: Array<{ player: string; team: TeamId }>, actions: Array<DeploymentAction | BuildAction | { kind: "tick"; count: number }>): MatchSnapshot {
  const snapshot = createMatchSnapshot(config, players);
  for (const action of actions) {
    if ("unitKind" in action) {
      deployUnit(snapshot, config, action);
      continue;
    }
    if ("towerKind" in action) {
      buildTower(snapshot, config, action);
      continue;
    }
    for (let index = 0; index < action.count; index += 1) {
      advanceTick(snapshot, config);
      if (snapshot.phase === "finished") {
        break;
      }
    }
  }
  return snapshot;
}
