export type TeamId = 0 | 1;

export type MatchPhase = "lobby" | "live" | "finished";

export interface UnitDefinition {
  id: number;
  label: string;
  cost: number;
  reward: number;
  health: number;
  damage: number;
  range: number;
  speed: number;
  fortressDamage: number;
  cooldownTicks: number;
}

export interface TowerDefinition {
  id: number;
  label: string;
  cost: number;
  reward: number;
  health: number;
  damage: number;
  range: number;
  attackCooldown: number;
}

export interface UnitInstance {
  id: number;
  owner: string;
  team: TeamId;
  lane: number;
  kind: number;
  position: number;
  hp: number;
  cooldown: number;
  alive: boolean;
}

export interface TowerInstance {
  id: number;
  owner: string;
  team: TeamId;
  lane: number;
  slot: number;
  kind: number;
  hp: number;
  cooldown: number;
  alive: boolean;
}

export interface ActionRecord {
  sequence: number;
  tick: number;
  actor: string;
  team: number;
  actionType: string;
  primary: number;
  secondary: number;
  amount: number;
}

export interface MatchSnapshot {
  matchId: number;
  phase: MatchPhase;
  tick: number;
  laneCount: number;
  fortressHp: [number, number];
  winnerTeam: number | null;
  players: string[];
  playerTeams: Record<string, TeamId>;
  units: UnitInstance[];
  towers: TowerInstance[];
  actionLog: ActionRecord[];
}

export interface EngineConfig {
  fortressHealth: number;
  laneCount: number;
  units: UnitDefinition[];
  towers: TowerDefinition[];
}

export interface FactionTheme {
  name: string;
  fortress: string;
  worker: string;
  accent: string;
  unitLabels: Record<number, string>;
  towerLabels: Record<number, string>;
}

export interface DeploymentAction {
  actor: string;
  team: TeamId;
  unitKind: number;
  lane: number;
}

export interface BuildAction {
  actor: string;
  team: TeamId;
  towerKind: number;
  lane: number;
  slot: number;
}
