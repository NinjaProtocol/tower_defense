import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { FortressScene } from "./phaserScene";
import type { MatchSnapshot } from "@/lib/types";

export function GameCanvas({ snapshot }: { snapshot: MatchSnapshot }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<FortressScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) {
      return;
    }

    const scene = new FortressScene();
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 900,
      height: 480,
      scene,
      transparent: true,
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  return <div ref={containerRef} className="game-canvas" />;
}
