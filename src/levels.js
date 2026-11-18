export const LEVELS = Object.freeze({
  district: Object.freeze({
    id: "district",
    name: "Restored District",
    status: "playable",
    nextLevelId: "moonlitForest",
    stageX: 46.2,
    levelMaxX: 49.2,
    cameraStageOffset: 2.7,
    exitHintOffset: 3.7,
    exitDoorHalfWidth: 1.2,
    checkpointX: 20.8,
    ground: { x: 21, y: -2.65, width: 56, height: 1.3, color: 0x121722 },
    stagePlatform: { y: -2.275, width: 7.4, height: 0.55, color: 0x21162a },
    platforms: [
      { x: 6.2, top: 0.99, width: 2.8, height: 0.34 },
      { x: 11.7, top: 1.49, width: 4.1, height: 0.72 },
      { x: 17.4, top: 0.99, width: 3.2, height: 0.46 },
      { x: 23.2, top: 1.44, width: 4.4, height: 0.82 },
      { x: 28.2, top: 0.99, width: 2.5, height: 0.58 },
      { x: 33, top: 1.35, width: 3.4, height: 0.52 },
      { x: 37.6, top: 2.25, width: 2.8, height: 0.62 },
      { x: 42, top: 1.35, width: 3.6, height: 0.72 },
    ],
    notes: [
      { x: 3.3, y: -0.9 },
      { x: 6.2, y: 2.05 },
      { x: 12, y: 2.35 },
      { x: 23.2, y: 2.3 },
      { x: 29.5, y: 2.05 },
      { x: 37.6, y: 3.3 },
      { x: 42, y: 2.4 },
    ],
    shadows: [
      { startX: 16.2, patrolMin: 14.2, patrolMax: 19.2, direction: 1 },
      { startX: 26.4, patrolMin: 24.7, patrolMax: 29.5, direction: -1 },
      { startX: 35.2, patrolMin: 32.3, patrolMax: 38.4, direction: 1 },
    ],
    platformSentinels: [
      { startX: 12.7, platformTop: 1.49, patrolMin: 10.25, patrolMax: 13.1, direction: -1 },
      { startX: 22.1, platformTop: 1.44, patrolMin: 21.55, patrolMax: 24.85, direction: 1 },
      { startX: 42.8, platformTop: 1.35, patrolMin: 40.55, patrolMax: 43.45, direction: -1 },
    ],
  }),
  moonlitForest: Object.freeze({
    id: "moonlitForest",
    name: "Moonlit Forest",
    status: "planned",
    lengthScale: 1.32,
    tagline: "A moonlit path is calling through the trees.",
    teaserCopy: "Beyond the restored district, moonlight breaks through the trees and a quieter signal answers your encore.",
    routeStatus: "Moonlit signal located · route forming",
    atmosphere: ["high moon", "layered trees", "low fog", "fireflies", "moonbeams"],
    enemyPlan: {
      newEnemy: "Silence Moth",
      firstEncounter: "isolated low flyby with a clear visual and audio warning",
      laterCombinations: ["ground shadows", "platform sentinels"],
    },
  }),
});

export const ACTIVE_LEVEL = LEVELS.district;
export const NEXT_LEVEL = LEVELS[ACTIVE_LEVEL.nextLevelId];
