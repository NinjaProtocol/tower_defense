import Phaser from "phaser";
import type { MatchSnapshot } from "@/lib/types";

export class FortressScene extends Phaser.Scene {
  private snapshot: MatchSnapshot | null = null;

  constructor() {
    super("fortress-scene");
  }

  setSnapshot(snapshot: MatchSnapshot) {
    this.snapshot = snapshot;
    if (this.sys?.isActive()) {
      this.renderSnapshot();
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#140b09");
    this.renderSnapshot();
  }

  private renderSnapshot() {
    this.children.removeAll();
    if (!this.snapshot) {
      return;
    }

    const laneHeight = 120;
    const originY = 60;
    for (let lane = 0; lane < this.snapshot.laneCount; lane += 1) {
      this.add.rectangle(450, originY + lane * laneHeight, 860, 4, 0x45311f);
    }

    this.add.rectangle(40, 240, 52, 340, 0x7c2d12);
    this.add.rectangle(860, 240, 52, 340, 0x1d4ed8);
    this.add.text(18, 52, "Orcs", { color: "#fdba74", fontSize: "18px" });
    this.add.text(810, 52, "Humans", { color: "#93c5fd", fontSize: "18px" });

    for (const tower of this.snapshot.towers.filter((entry) => entry.alive)) {
      const x = tower.team === 0 ? 120 + tower.slot * 120 : 780 - tower.slot * 120;
      const y = originY + tower.lane * laneHeight;
      this.add.rectangle(x, y, 18, 32, tower.team === 0 ? 0xea580c : 0x2563eb);
    }

    for (const unit of this.snapshot.units.filter((entry) => entry.alive)) {
      const x = 60 + unit.position * 8;
      const y = originY + unit.lane * laneHeight;
      this.add.circle(x, y, 10, unit.team === 0 ? 0xf97316 : 0x60a5fa);
    }
  }
}
