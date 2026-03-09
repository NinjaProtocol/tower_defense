import type { EngineConfig, FactionTheme, TeamId } from "./types";

export const defaultCatalog: EngineConfig = {
  fortressHealth: 100,
  laneCount: 3,
  units: [
    { id: 0, label: "Worker", cost: 5, reward: 2, health: 18, damage: 4, range: 8, speed: 6, fortressDamage: 8, cooldownTicks: 1 },
    { id: 1, label: "Frontline", cost: 9, reward: 4, health: 32, damage: 6, range: 10, speed: 4, fortressDamage: 10, cooldownTicks: 2 },
    { id: 2, label: "Siege", cost: 12, reward: 6, health: 26, damage: 9, range: 9, speed: 5, fortressDamage: 14, cooldownTicks: 2 },
  ],
  towers: [
    { id: 0, label: "Guard Tower", cost: 8, reward: 4, health: 22, damage: 5, range: 22, attackCooldown: 1 },
    { id: 1, label: "Cannon Tower", cost: 14, reward: 7, health: 34, damage: 8, range: 18, attackCooldown: 2 },
  ],
};

export const factionThemes: Record<TeamId, FactionTheme> = {
  0: {
    name: "Orcish Horde",
    fortress: "Stronghold",
    worker: "Peon",
    accent: "#9a3412",
    unitLabels: {
      0: "Peon",
      1: "Grunt",
      2: "Catapult",
    },
    towerLabels: {
      0: "Watch Tower",
      1: "Cannon Tower",
    },
  },
  1: {
    name: "Human Kingdom",
    fortress: "Keep",
    worker: "Peasant",
    accent: "#1d4ed8",
    unitLabels: {
      0: "Peasant",
      1: "Footman",
      2: "Ballista",
    },
    towerLabels: {
      0: "Guard Tower",
      1: "Cannon Tower",
    },
  },
};

export function getFactionTheme(team: TeamId): FactionTheme {
  return factionThemes[team];
}

export function getUnitLabel(team: TeamId, unitKind: number): string {
  return factionThemes[team].unitLabels[unitKind] ?? defaultCatalog.units.find((unit) => unit.id === unitKind)?.label ?? `Unit ${unitKind}`;
}

export function getTowerLabel(team: TeamId, towerKind: number): string {
  return factionThemes[team].towerLabels[towerKind] ?? defaultCatalog.towers.find((tower) => tower.id === towerKind)?.label ?? `Tower ${towerKind}`;
}
