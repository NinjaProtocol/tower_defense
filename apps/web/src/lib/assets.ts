function assetUrl(folder: string, fileName: string): string {
  return encodeURI(`/${folder}/${fileName}`);
}

export const warcraftAudio = {
  orcSelect: assetUrl("warcraft_library", "WC1 Orc select1.wav"),
  orcAcknowledge: assetUrl("warcraft_library", "WC1 Orc acknowledge1.wav"),
  orcWorkComplete: assetUrl("warcraft_library", "WC1 Orc work complete.wav"),
  orcWin: assetUrl("warcraft_library", "WC1 Orc win1.wav"),
  humanSelect: assetUrl("warcraft_library", "WC1 Human select1.wav"),
  humanAcknowledge: assetUrl("warcraft_library", "WC1 Human acknowledge1.wav"),
  humanWorkComplete: assetUrl("warcraft_library", "WC1 Human work complete.wav"),
  humanWin: assetUrl("warcraft_library", "WC1 Human win1.wav"),
};

export const warcraftVisuals = {
  forestTiles: assetUrl("warcraft_library", "Warcraft O&H Forest 1.png"),
  swampTiles: assetUrl("warcraft_library", "Warcraft O&H Swamp 1.png"),
  humanRoad: assetUrl("warcraft_library", "WC1HumanRoad.gif"),
  orcRoad: assetUrl("warcraft_library", "WC1OrcRoad.gif"),
  humanFortress: assetUrl("warcraft_library", "WC1HumanTownHall.gif"),
  orcFortress: assetUrl("warcraft_library", "WC1OrcTownHall.gif"),
};

export const socVisuals = {
  orcWorker: assetUrl("soc_library", "Art/Avatar_Peon.png"),
  orcFrontline: assetUrl("soc_library", "Art/Avatar_Grunt.png"),
  orcSiege: assetUrl("soc_library", "Art/Avatar_Catapult.png"),
  orcTower: assetUrl("soc_library", "Art/DragonRoost_Preview.png"),
  humanWorker: assetUrl("soc_library", "Art/Avatar_Peasant.png"),
  humanFrontline: assetUrl("soc_library", "Art/Avatar_Footman.png"),
  humanSiege: assetUrl("soc_library", "Art/Avatar_Ballista.png"),
  humanTower: assetUrl("soc_library", "Art/ForestSentinel_Preview.png"),
};
