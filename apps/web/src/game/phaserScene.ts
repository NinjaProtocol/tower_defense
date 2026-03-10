import Phaser from "phaser";
import type { MatchSnapshot } from "@/lib/types";
import { laneLabels } from "@/lib/catalog";
import { socVisuals, warcraftVisuals } from "@/lib/assets";

export class FortressScene extends Phaser.Scene {
  private snapshot: MatchSnapshot | null = null;

  constructor() {
    super("fortress-scene");
  }

  preload() {
    this.load.image("terrain-forest", warcraftVisuals.forestTiles);
    this.load.image("terrain-swamp", warcraftVisuals.swampTiles);
    this.load.image("fortress-orc", warcraftVisuals.orcFortress);
    this.load.image("fortress-human", warcraftVisuals.humanFortress);
    this.load.image("orc-worker", socVisuals.orcWorker);
    this.load.image("orc-frontline", socVisuals.orcFrontline);
    this.load.image("orc-siege", socVisuals.orcSiege);
    this.load.image("human-worker", socVisuals.humanWorker);
    this.load.image("human-frontline", socVisuals.humanFrontline);
    this.load.image("human-siege", socVisuals.humanSiege);
    this.load.image("orc-tower", socVisuals.orcTower);
    this.load.image("human-tower", socVisuals.humanTower);
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
    this.add.image(220, 240, "terrain-swamp").setDisplaySize(440, 480).setAlpha(0.45);
    this.add.image(680, 240, "terrain-forest").setDisplaySize(440, 480).setAlpha(0.45);
    for (let lane = 0; lane < this.snapshot.laneCount; lane += 1) {
      const y = originY + lane * laneHeight;
      this.add.rectangle(450, y, 860, 42, 0x3f2a1c, 0.85);
      this.add.rectangle(450, y, 860, 4, 0xc2410c, 0.8);
      this.add.text(400, y - 42, laneLabels[lane].toUpperCase(), { color: "#f8fafc", fontSize: "15px" });
      for (let slot = 0; slot < 3; slot += 1) {
        this.add.rectangle(140 + slot * 80, y - 34, 28, 28, 0x7c2d12, 0.38).setStrokeStyle(1, 0xfb923c, 0.8);
        this.add.rectangle(140 + slot * 80, y + 34, 28, 28, 0x7c2d12, 0.38).setStrokeStyle(1, 0xfb923c, 0.8);
        this.add.rectangle(760 - slot * 80, y - 34, 28, 28, 0x1d4ed8, 0.38).setStrokeStyle(1, 0x93c5fd, 0.8);
        this.add.rectangle(760 - slot * 80, y + 34, 28, 28, 0x1d4ed8, 0.38).setStrokeStyle(1, 0x93c5fd, 0.8);
      }
    }

    this.add.image(52, 240, "fortress-orc").setDisplaySize(84, 84);
    this.add.image(848, 240, "fortress-human").setDisplaySize(84, 84);
    this.add.text(18, 24, "Orcs", { color: "#fdba74", fontSize: "18px" });
    this.add.text(790, 24, "Humans", { color: "#93c5fd", fontSize: "18px" });

    for (const tower of this.snapshot.towers.filter((entry) => entry.alive)) {
      const x = tower.team === 0 ? 120 + tower.slot * 120 : 780 - tower.slot * 120;
      const y = originY + tower.lane * laneHeight;
      this.add.image(x, y, tower.team === 0 ? "orc-tower" : "human-tower").setDisplaySize(38, 44);
    }

    for (const unit of this.snapshot.units.filter((entry) => entry.alive)) {
      const x = 60 + unit.position * 8;
      const y = originY + unit.lane * laneHeight;
      const key = unit.team === 0
        ? unit.kind === 0 ? "orc-worker" : unit.kind === 1 ? "orc-frontline" : "orc-siege"
        : unit.kind === 0 ? "human-worker" : unit.kind === 1 ? "human-frontline" : "human-siege";
      this.add.image(x, y, key).setDisplaySize(28, 28);
    }
  }
}
