import * as THREE from "three";
import { ACTIVE_LEVEL, NEXT_LEVEL } from "./levels.js?v=forest-full-route-1";

const TOTAL_NOTES = ACTIVE_LEVEL.notes.length;
const IS_FOREST = ACTIVE_LEVEL.theme === "forest";
const BASE_GLOW_INTENSITY = IS_FOREST ? 10 : 26;
const MAX_HEALTH = 3;
const MAX_SOUND_ENERGY = 2;
const STARTING_SOUND_ENERGY = 1;
const PLAYER = { width: 0.82, height: 2.04, speed: 5.4, jump: 10.8 };
const SHADOW = { width: 0.88, height: 0.82, speed: 1.35 };
const PLATFORM_SENTINEL = { width: 0.64, height: 0.58, speed: 1.05 };
const SILENCE_MOTH = { width: 1.16, height: 0.72 };
const SOUND_WAVE = { cost: 1, range: 3.6, duration: 0.52, cooldown: 1.1, stun: 2.8 };
const LEVEL_SCORE = { note: 200, allNotesBonus: 600, health: 100 };
const NOTE_PROXIMITY = { radius: 3.2, collectRadius: 0.9 };
const DAMAGE = { invulnerability: 1.35, knockback: 1.55, bounce: 6.2 };
const STAGE_X = ACTIVE_LEVEL.stageX;
const LEVEL_MAX_X = ACTIVE_LEVEL.levelMaxX;
const CAMERA_MAX_X = STAGE_X - ACTIVE_LEVEL.cameraStageOffset;
const EXIT_HINT_X = STAGE_X - ACTIVE_LEVEL.exitHintOffset;
const EXIT_DOOR = {
  minX: STAGE_X - ACTIVE_LEVEL.exitDoorHalfWidth,
  maxX: STAGE_X + ACTIVE_LEVEL.exitDoorHalfWidth,
};
const EXIT_FLOOR_TOP = ACTIVE_LEVEL.stagePlatform.y + ACTIVE_LEVEL.stagePlatform.height / 2;
const CHECKPOINTS = ACTIVE_LEVEL.checkpointXs || [ACTIVE_LEVEL.checkpointX];
const PLAYER_Z = 2;
const PLAYER_START_Y = -0.98;
const GRAVITY = 18;
const GUITAR_CARRY_POSITION = new THREE.Vector3(-0.22, -0.01, -0.34);
const GUITAR_SIDE_BACK_POSITION = new THREE.Vector3(-0.72, 0.05, -0.34);
const GUITAR_SIDE_FRONT_POSITION = new THREE.Vector3(-0.72, 0.05, 0.72);
const GUITAR_PLAY_POSITION = new THREE.Vector3(0.14, -0.01, 0.48);
const ENCORE_GUITAR_PATH = new THREE.CubicBezierCurve3(
  GUITAR_SIDE_FRONT_POSITION,
  new THREE.Vector3(-0.58, 0.12, 0.76),
  new THREE.Vector3(-0.18, 0.1, 0.68),
  GUITAR_PLAY_POSITION,
);
const ENCORE_TURN_END = 0.22;
const ENCORE_DETACH_END = 0.48;
const ENCORE_CLEAR_END = 0.88;
const ENCORE_LIFT_END = 1.58;
const ENCORE_HEAD_TURN_END = 2.08;
const ENCORE_SOLO_START = 2.14;
const ENCORE_PANEL_TIME = 3.72;
const ENCORE_BACK_ARM_START_Z = -0.02;
const ENCORE_BACK_ARM_FRONT_Z = 0.8;
const ENCORE_SPARK_COUNT = 72;
const ENCORE_SOLO_NOTES = [
  { time: 0, frequency: 196, light: 0, color: 0x4de8ff, strum: 1, type: "sawtooth" },
  { time: 0.16, frequency: 247, light: 1, color: 0xff3fbf, strum: -1, type: "triangle" },
  { time: 0.32, frequency: 294, light: 2, color: 0xffd2ee, strum: 1, type: "triangle" },
  { time: 0.48, frequency: 392, light: 0, color: 0x4de8ff, strum: -1, type: "sawtooth" },
  { time: 0.64, frequency: 494, light: 1, color: 0xff3fbf, strum: 1, type: "triangle" },
  { time: 0.8, frequency: 587, light: 2, color: 0xffd2ee, strum: -1, type: "triangle" },
  { time: 0.96, frequency: 784, light: 1, color: 0xff7bd8, strum: 1, type: "sawtooth" },
];
const ARM_REST_DIRECTION = new THREE.Vector3(0, -1, 0);
const GUITAR_NECK_GRIP = new THREE.Vector3(0, 0.46, 0.12);
const GUITAR_STRINGS_GRIP = new THREE.Vector3(0.02, -0.06, 0.26);
const encoreArmDirection = new THREE.Vector3();
const encoreArmAim = new THREE.Quaternion();
const encoreSparkOrigin = new THREE.Vector3();
const encoreStringsGrip = new THREE.Vector3();

const ui = {
  game: document.querySelector("#game"),
  intro: document.querySelector("#intro"),
  introKicker: document.querySelector("#intro-kicker"),
  introTagline: document.querySelector("#intro-tagline"),
  introGoal: document.querySelector("#intro-goal"),
  encore: document.querySelector("#encore"),
  encoreKicker: document.querySelector("#encore-kicker"),
  encoreTitle: document.querySelector("#encore-title"),
  gameOver: document.querySelector("#game-over"),
  noteCount: document.querySelector("#note-count"),
  soundEnergy: document.querySelector("#sound-energy"),
  energyPips: [...document.querySelectorAll("#sound-energy .energy-pip")],
  health: document.querySelector("#health"),
  healthHearts: [...document.querySelectorAll("#health .heart")],
  mission: document.querySelector("#mission-text"),
  encoreScore: document.querySelector("#encore-score"),
  encoreTotalScore: document.querySelector("#encore-total-score"),
  encoreNotes: document.querySelector("#encore-notes"),
  encoreNotePoints: document.querySelector("#encore-note-points"),
  encoreRhythm: document.querySelector("#encore-rhythm"),
  encoreRhythmPoints: document.querySelector("#encore-rhythm-points"),
  encoreWaves: document.querySelector("#encore-waves"),
  encoreBonus: document.querySelector("#encore-bonus"),
  continueJourney: document.querySelector("#continue-button"),
  nextLocation: document.querySelector("#next-location"),
  nextLocationName: document.querySelector("#next-location-name"),
  nextLocationCopy: document.querySelector("#next-location-copy"),
  nextLocationRouteName: document.querySelector("#next-location-route-name"),
  nextLocationStatus: document.querySelector("#next-location-status"),
  nextLocationScore: document.querySelector("#next-location-score"),
  nextEnter: document.querySelector("#next-enter-button"),
  nextReplay: document.querySelector("#next-replay-button"),
  gameOverScore: document.querySelector("#game-over-score"),
  soundControl: document.querySelector("#sound-control"),
  soundControlLabel: document.querySelector("#sound-control-label"),
  start: document.querySelector("#start-button"),
  restart: document.querySelector("#restart-button"),
  retry: document.querySelector("#retry-button"),
  pauseButton: document.querySelector("#pause-button"),
  pauseMenu: document.querySelector("#pause-menu"),
  resume: document.querySelector("#resume-button"),
  checkpointButton: document.querySelector("#checkpoint-button"),
  restartLevel: document.querySelector("#restart-level-button"),
  volumeSlider: document.querySelector("#volume-slider"),
  volumeOutput: document.querySelector("#volume-output"),
  guidance: document.querySelector("#guidance"),
  guidanceLabel: document.querySelector("#guidance-label"),
  guidanceText: document.querySelector("#guidance-text"),
  checkpointNotice: document.querySelector("#checkpoint-notice"),
  touchControls: document.querySelector("#touch-controls"),
  touchMoveButtons: [...document.querySelectorAll("[data-move-key]")],
  touchJump: document.querySelector("#touch-jump"),
  touchSound: document.querySelector("#touch-sound"),
};

ui.introKicker.textContent = ACTIVE_LEVEL.introKicker;
ui.introTagline.textContent = ACTIVE_LEVEL.introTagline;
ui.introGoal.textContent = ACTIVE_LEVEL.introGoal;
ui.start.textContent = ACTIVE_LEVEL.startLabel;
ui.mission.textContent = ACTIVE_LEVEL.missionText;
ui.game.classList.toggle("forest-level", IS_FOREST);
ui.encoreKicker.textContent = ACTIVE_LEVEL.resultKicker;
ui.encoreTitle.textContent = ACTIVE_LEVEL.resultTitle;
ui.restart.textContent = ACTIVE_LEVEL.replayLabel;
ui.noteCount.textContent = `0 / ${TOTAL_NOTES}`;
ui.continueJourney.hidden = !NEXT_LEVEL;
ui.nextEnter.hidden = !NEXT_LEVEL;
if (NEXT_LEVEL) {
  ui.nextLocationName.textContent = NEXT_LEVEL.name;
  ui.nextLocationCopy.textContent = NEXT_LEVEL.teaserCopy;
  ui.nextLocationRouteName.textContent = NEXT_LEVEL.name;
  ui.nextLocationStatus.textContent = NEXT_LEVEL.routeStatus;
  ui.nextEnter.textContent = `Enter ${NEXT_LEVEL.name}`;
}

const scene = new THREE.Scene();
const nightBackground = new THREE.Color(IS_FOREST ? 0x07110f : 0x050711);
const encoreBackground = new THREE.Color(IS_FOREST ? 0x10201a : 0x12091c);
scene.background = nightBackground.clone();
scene.fog = new THREE.FogExp2(IS_FOREST ? 0x0a1815 : 0x070914, IS_FOREST ? 0.042 : 0.032);

const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 100);
camera.position.set(0, 0.7, 12);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
ui.game.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(
  IS_FOREST ? 0x789b9b : 0x62789e,
  IS_FOREST ? 0x07100c : 0x07070b,
  IS_FOREST ? 1.38 : 1.2,
));

const moon = new THREE.DirectionalLight(0xa8c9ff, 2.2);
moon.position.set(-5, 10, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -18;
moon.shadow.camera.right = 18;
moon.shadow.camera.top = 12;
moon.shadow.camera.bottom = -8;
scene.add(moon);

const neon = new THREE.PointLight(IS_FOREST ? 0x8ce7c2 : 0x39dff7, BASE_GLOW_INTENSITY, 12, 2);
neon.position.set(4, 2, 3);
scene.add(neon);

const stageLights = [
  {
    color: 0x4de8ff,
    offsetX: -1.45,
    targetOffsetX: -0.65,
    targetIntensity: 88,
    delay: 0.08,
  },
  {
    color: 0xff3fbf,
    offsetX: 0,
    targetOffsetX: 0,
    targetIntensity: 122,
    delay: 0.36,
  },
  {
    color: 0xffd2ee,
    offsetX: 1.45,
    targetOffsetX: 0.65,
    targetIntensity: 96,
    delay: 0.64,
  },
].map((spec) => {
  const light = new THREE.SpotLight(spec.color, 0, 18, Math.PI / 7, 0.48, 1.35);
  light.position.set(STAGE_X + spec.offsetX, 6.4, 4.5);
  light.target.position.set(STAGE_X + spec.targetOffsetX, -0.65, 0);
  scene.add(light, light.target);
  return { ...spec, light };
});
const stageLightBeams = [];

const platforms = [];
const notes = [];
const shadows = [];
const platformSentinels = [];
const silenceMoths = [];
const soundWaves = [];
const checkpoints = [];
const parallaxLayers = [];
const atmosphere = { lights: [], fog: [], motes: null, windows: [], beacons: [] };
const keys = new Set();
let started = false;
let completed = false;
let defeated = false;
let collected = 0;
let health = MAX_HEALTH;
let soundEnergy = STARTING_SOUND_ENERGY;
let soundWavesUsed = 0;
let invulnerabilityTime = 0;
let velocityY = 0;
let onGround = false;
let facing = 1;
let audio = null;
let masterGain = null;
let masterVolume = 1;
let audioWarmupComplete = false;
let landingBounce = 0;
let soundWaveCooldown = 0;
let checkpointState = null;
let guidanceTimer = null;
let checkpointNoticeTimer = null;
let nextTransitionTimer = null;
let transitioningToNext = false;
let exitHintShown = false;
let paused = false;
let gameTime = 0;
let encoreStartTime = 0;
let encoreSoloStarted = false;
let encoreSoloNoteIndex = 0;
let encoreSparks = null;
let encoreEntryYaw = 0;
let encoreEntryLean = 0;
let encoreEntryGuitarRoll = 0;
const encoreEntryShoulders = {
  back: new THREE.Quaternion(),
  front: new THREE.Quaternion(),
};
const touchPreferred = matchMedia("(hover: none), (pointer: coarse)").matches;

function hideGuidance() {
  clearTimeout(guidanceTimer);
  guidanceTimer = null;
  ui.guidance.hidden = true;
}

function showGuidance(text, label = "Tip", duration = 4600) {
  clearTimeout(guidanceTimer);
  ui.guidanceLabel.textContent = label;
  ui.guidanceText.textContent = text;
  ui.guidance.hidden = false;
  guidanceTimer = setTimeout(hideGuidance, duration);
}

function hideCheckpointNotice() {
  clearTimeout(checkpointNoticeTimer);
  checkpointNoticeTimer = null;
  ui.checkpointNotice.hidden = true;
}

function showCheckpointNotice() {
  clearTimeout(checkpointNoticeTimer);
  ui.checkpointNotice.hidden = false;
  checkpointNoticeTimer = setTimeout(hideCheckpointNotice, 2400);
}

function pauseGame() {
  if (!started || completed || defeated || paused) return;
  paused = true;
  keys.clear();
  releaseTouchMovement();
  hideGuidance();
  ui.pauseMenu.hidden = false;
  ui.game.classList.add("is-paused");
  ui.pauseButton.setAttribute("aria-pressed", "true");
  ui.checkpointButton.hidden = !checkpointState;
  ui.resume.focus();
}

function resumeGame() {
  if (!paused) return;
  paused = false;
  ui.pauseMenu.hidden = true;
  ui.game.classList.remove("is-paused");
  ui.pauseButton.setAttribute("aria-pressed", "false");
  clock.getDelta();
  ui.pauseButton.focus();
}

function togglePause() {
  if (paused) resumeGame();
  else pauseGame();
}

function trapPauseFocus(event) {
  const focusable = [...ui.pauseMenu.querySelectorAll("button:not([hidden]), input:not([disabled])")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function mat(color, roughness = 0.76, metalness = 0.18) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createForest() {
  const farLayer = new THREE.Group();
  const midLayer = new THREE.Group();
  const nearLayer = new THREE.Group();
  const farTreeMaterial = new THREE.MeshBasicMaterial({ color: 0x0b201c });
  const midTreeMaterial = new THREE.MeshBasicMaterial({ color: 0x102a23 });
  const trunkMaterial = mat(0x18231d, 0.96, 0.02);
  const canopyMaterial = mat(0x173228, 0.94, 0.02);

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 48),
    new THREE.MeshBasicMaterial({
      color: 0xaee8dc,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 48),
    new THREE.MeshBasicMaterial({
      color: 0xd8f4e8,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    }),
  );
  moonHalo.position.set(7.2, 3.35, -11.5);
  moonDisc.position.set(7.2, 3.35, -11.35);
  farLayer.add(moonHalo, moonDisc);

  const addTree = (layer, x, height, depth, material, width = 1) => {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(width * 0.2, height, 0.5), material);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(width, height * 0.82, 9), material);
    trunk.position.set(x, height / 2 - 2.15, depth);
    crown.position.set(x, height * 0.72 - 0.8, depth + 0.02);
    layer.add(trunk, crown);
  };

  for (let i = 0; i < 30; i += 1) {
    addTree(
      farLayer,
      -13 + i * 2.8,
      5.5 + ((i * 7) % 5) * 0.55,
      -10.8 - (i % 3) * 0.35,
      farTreeMaterial,
      1.1 + (i % 3) * 0.18,
    );
  }

  for (let i = 0; i < 26; i += 1) {
    addTree(
      midLayer,
      -9 + i * 3,
      5 + ((i * 5) % 4) * 0.72,
      -7.2 - (i % 2) * 0.45,
      midTreeMaterial,
      1.2 + (i % 4) * 0.14,
    );
  }

  [-3, 2.2, 7.8, 13.6, 19.4, 25, 31.5, 36, 42, 48, 54, 60, 66].forEach((x, index) => {
    const height = 4.8 + (index % 3) * 0.65;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, height, 9), trunkMaterial);
    trunk.position.set(x, height / 2 - 2, -3.8 - (index % 2) * 0.5);
    trunk.rotation.z = (index % 2 === 0 ? -1 : 1) * 0.035;
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1.45, 12, 9), canopyMaterial);
    crown.scale.set(1.25, 0.72, 0.62);
    crown.position.set(x + (index % 2 ? 0.18 : -0.18), height - 1.15, trunk.position.z);
    nearLayer.add(trunk, crown);
  });

  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(82, 2.2),
    new THREE.MeshBasicMaterial({
      color: 0x4c927c,
      transparent: true,
      opacity: 0.055,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  haze.position.set(30, -0.55, -8.6);
  farLayer.add(haze);

  scene.add(farLayer, midLayer, nearLayer);
  parallaxLayers.push(
    { group: farLayer, factor: 0.76, baseX: 0 },
    { group: midLayer, factor: 0.48, baseX: 0 },
    { group: nearLayer, factor: 0.2, baseX: 0 },
  );
}

function createCity() {
  const farLayer = new THREE.Group();
  const cityLayer = new THREE.Group();
  const farBuildings = new THREE.MeshBasicMaterial({ color: 0x0d1930 });
  const farWindows = new THREE.MeshBasicMaterial({
    color: 0x2a5f78,
    transparent: true,
    opacity: 0.65,
  });
  const buildings = mat(0x0b1020, 0.92, 0.05);
  const windows = new THREE.MeshBasicMaterial({ color: 0x203a51 });
  const occupiedWindowColors = [
    0xffbd72,
    0xffd59a,
    0xffc783,
    0xffdfa8,
    0xf2b978,
    0xffcf91,
    0x72d7e7,
    0xd783bd,
  ];

  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 48),
    new THREE.MeshBasicMaterial({
      color: 0x3f7690,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 48),
    new THREE.MeshBasicMaterial({
      color: 0x2a7795,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  moonDisc.position.set(5.5, 3, -9.7);
  moonHalo.position.set(5.5, 3, -9.82);
  farLayer.add(moonHalo, moonDisc);

  for (let i = 0; i < 19; i += 1) {
    const width = 3 + (i % 4) * 0.72;
    const height = 4.2 + ((i * 5) % 8) * 0.58;
    const x = -16 + i * 4.25;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, 1.2), farBuildings);
    building.position.set(x, height / 2 - 2.7, -11.2 - (i % 2) * 0.45);
    farLayer.add(building);

    if (i % 2 === 0) {
      const roofGlow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.62, 0.035, 0.06), farWindows);
      roofGlow.position.set(x, height - 2.68, building.position.z + 0.62);
      farLayer.add(roofGlow);
    }

    if (i % 3 === 0) {
      const beaconMaterial = farWindows.clone();
      const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.35, 0.04), farWindows);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), beaconMaterial);
      antenna.position.set(x + width * 0.18, height - 2.25, -10.55);
      beacon.position.set(x + width * 0.18, height - 1.55, -10.55);
      beacon.userData.phase = i * 0.7;
      farLayer.add(antenna, beacon);
      atmosphere.beacons.push(beacon);
    }
  }

  for (let i = 0; i < 22; i += 1) {
    const width = 2.4 + (i % 4) * 0.65;
    const height = 4.5 + ((i * 7) % 9) * 0.72;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, 2.4), buildings);
    building.position.set(-9 + i * 2.7, height / 2 - 2.5, -6 - (i % 3) * 1.4);
    cityLayer.add(building);
    for (let row = 0; row < Math.floor(height / 1.25); row += 1) {
      if ((row + i) % 3 === 0) continue;
      const canChange = (i * 7 + row * 5) % 11 < 4;
      const windowMaterial = canChange ? windows.clone() : windows;
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), windowMaterial);
      windowMesh.position.set(building.position.x - width * 0.2, -1.4 + row * 1.12, building.position.z + 1.21);
      cityLayer.add(windowMesh);

      if (canChange) {
        const startsLit = (i * 3 + row * 7) % 4 === 0;
        const offColor = new THREE.Color(0x203a51);
        const onColor = new THREE.Color(occupiedWindowColors[(i * 3 + row) % occupiedWindowColors.length]);
        windowMaterial.color.copy(startsLit ? onColor : offColor);
        atmosphere.windows.push({
          material: windowMaterial,
          offColor,
          onColor,
          level: startsLit ? 1 : 0,
          target: startsLit ? 1 : 0,
          time: 2.5 + ((i + row * 2) % 7) * 0.85 + Math.random() * 2.5,
        });
      }
    }
  }

  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(86, 1.8),
    new THREE.MeshBasicMaterial({
      color: 0x15314a,
      transparent: true,
      opacity: 0.075,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  haze.position.set(22, -0.55, -8.8);
  farLayer.add(haze);

  scene.add(farLayer, cityLayer);
  parallaxLayers.push(
    { group: farLayer, factor: 0.72, baseX: 0 },
    { group: cityLayer, factor: 0.38, baseX: 0 },
  );
}

function updateParallax(elapsed) {
  parallaxLayers.forEach((layer) => {
    layer.group.position.x = layer.baseX + camera.position.x * layer.factor;
  });

  atmosphere.beacons.forEach((beacon) => {
    beacon.material.opacity = 0.3 + (Math.sin(elapsed * 2.4 + beacon.userData.phase) + 1) * 0.28;
  });
}

function addPlatform(x, y, width, height, color = 0x171d2a) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 2.3), mat(color));
  mesh.position.set(x, y, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  platforms.push({ x, y, width, height });

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.045, 2.34),
    new THREE.MeshBasicMaterial({ color: IS_FOREST ? 0x5f8a72 : 0x2d6475 }),
  );
  edge.position.set(x, y + height / 2 + 0.025, 0);
  scene.add(edge);
}

function createForestClearing() {
  const bark = mat(0x263429, 0.88, 0.04);
  const runeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb8f5df,
    emissive: 0x4cbf97,
    emissiveIntensity: 1.8,
    roughness: 0.32,
    metalness: 0.12,
  });
  const left = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 4.1, 10), bark);
  const right = left.clone();
  left.position.set(STAGE_X - 1.72, 0.05, -0.2);
  right.position.set(STAGE_X + 1.72, 0.05, -0.2);
  left.rotation.z = -0.09;
  right.rotation.z = 0.09;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.19, 10, 42, Math.PI), bark);
  arch.rotation.z = Math.PI;
  arch.position.set(STAGE_X, 1.93, -0.18);
  const rune = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.035, 8, 64), runeMaterial);
  rune.position.set(STAGE_X, 0.45, 0.28);
  const gateGlow = new THREE.PointLight(0x8fe8c5, 12, 7, 2);
  gateGlow.position.set(STAGE_X, 0.45, 1.5);
  scene.add(left, right, arch, rune, gateGlow);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  context.fillStyle = "#08130f";
  context.fillRect(0, 0, 512, 180);
  context.strokeStyle = "#8fe8c5";
  context.lineWidth = 7;
  context.strokeRect(10, 10, 492, 160);
  context.fillStyle = "#dcfff2";
  context.font = "700 80px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(ACTIVE_LEVEL.stageLabel, 256, 96);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.9),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true }),
  );
  sign.position.set(STAGE_X, 2.52, 0.35);
  scene.add(sign);

  stageLights.forEach(({ color, offsetX }, index) => {
    const forestColor = index === 1 ? 0x8fe8c5 : color;
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: 0x17251e,
      emissive: forestColor,
      emissiveIntensity: 0.18,
      roughness: 0.72,
      metalness: 0.12,
    });
    const fixture = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), fixtureMaterial);
    fixture.position.set(STAGE_X + offsetX * 0.72, 2.9, 0.3);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: forestColor,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.05, 4.4, 28, 1, true), beamMaterial);
    beam.position.set(STAGE_X + offsetX * 0.4, 0.55, 0.22 - index * 0.04);
    beam.rotation.z = (index - 1) * 0.06;
    scene.add(fixture, beam);
    stageLightBeams.push({ beam, fixtureMaterial });
  });
}

function createStage() {
  if (IS_FOREST) {
    createForestClearing();
    return;
  }
  const stageMaterial = mat(0x292035, 0.55, 0.38);
  const pillarGeometry = new THREE.BoxGeometry(0.4, 4.2, 1.2);
  const left = new THREE.Mesh(pillarGeometry, stageMaterial);
  const right = left.clone();
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.42, 1.2), stageMaterial);
  left.position.set(STAGE_X - 2.2, 0.1, -0.2);
  right.position.set(STAGE_X + 2.2, 0.1, -0.2);
  roof.position.set(STAGE_X, 2.2, -0.2);
  scene.add(left, right, roof);

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  context.fillStyle = "#080914";
  context.fillRect(0, 0, 512, 180);
  context.strokeStyle = "#ff3fbf";
  context.lineWidth = 8;
  context.strokeRect(10, 10, 492, 160);
  context.fillStyle = "#f7dff4";
  context.font = "700 98px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("LIVE", 256, 97);

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.1, 1.05),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas) }),
  );
  sign.position.set(STAGE_X, 1.35, 0.45);
  scene.add(sign);

  stageLights.forEach(({ color, offsetX }, index) => {
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c2030,
      emissive: color,
      emissiveIntensity: 0.18,
      roughness: 0.42,
      metalness: 0.58,
    });
    const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.34, 12), fixtureMaterial);
    fixture.rotation.z = Math.PI / 2;
    fixture.position.set(STAGE_X + offsetX * 0.72, 2.58, 0.35);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 28, 1, true), beamMaterial);
    beam.position.set(STAGE_X + offsetX * 0.45, 0.42, 0.28 - index * 0.04);
    beam.rotation.z = (index - 1) * 0.08;
    scene.add(fixture, beam);
    stageLightBeams.push({ beam, fixtureMaterial });
  });
}

function createEncoreSparks() {
  const positions = new Float32Array(ENCORE_SPARK_COUNT * 3);
  const colors = new Float32Array(ENCORE_SPARK_COUNT * 3);
  const baseColors = new Float32Array(ENCORE_SPARK_COUNT * 3);
  const velocities = Array.from({ length: ENCORE_SPARK_COUNT }, () => new THREE.Vector3());
  const life = new Float32Array(ENCORE_SPARK_COUNT);
  const geometry = new THREE.BufferGeometry();

  for (let index = 0; index < ENCORE_SPARK_COUNT; index += 1) {
    positions[index * 3 + 1] = -50;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  points.renderOrder = 7;
  scene.add(points);
  return { points, velocities, life, baseColors, cursor: 0 };
}

function burstEncoreSparks(origin, color) {
  if (!encoreSparks) return;
  const positions = encoreSparks.points.geometry.getAttribute("position");
  const colors = encoreSparks.points.geometry.getAttribute("color");
  const sparkColor = new THREE.Color(color);

  for (let spark = 0; spark < 10; spark += 1) {
    const index = encoreSparks.cursor;
    encoreSparks.cursor = (encoreSparks.cursor + 1) % ENCORE_SPARK_COUNT;
    const angle = 0.18 + (spark / 9) * (Math.PI - 0.36);
    const speed = 1.25 + Math.random() * 1.15;
    positions.setXYZ(
      index,
      origin.x + (Math.random() - 0.5) * 0.18,
      origin.y + (Math.random() - 0.5) * 0.12,
      origin.z + 0.12 + (Math.random() - 0.5) * 0.16,
    );
    colors.setXYZ(index, sparkColor.r, sparkColor.g, sparkColor.b);
    encoreSparks.baseColors[index * 3] = sparkColor.r;
    encoreSparks.baseColors[index * 3 + 1] = sparkColor.g;
    encoreSparks.baseColors[index * 3 + 2] = sparkColor.b;
    encoreSparks.velocities[index].set(
      Math.cos(angle) * speed,
      0.85 + Math.sin(angle) * speed,
      (Math.random() - 0.5) * 0.65,
    );
    encoreSparks.life[index] = 0.58 + Math.random() * 0.24;
  }
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

function updateEncoreSparks(delta) {
  if (!encoreSparks) return;
  const positions = encoreSparks.points.geometry.getAttribute("position");
  const colors = encoreSparks.points.geometry.getAttribute("color");

  for (let index = 0; index < ENCORE_SPARK_COUNT; index += 1) {
    if (encoreSparks.life[index] <= 0) continue;
    encoreSparks.life[index] = Math.max(0, encoreSparks.life[index] - delta);
    if (encoreSparks.life[index] === 0) {
      positions.setY(index, -50);
      continue;
    }

    const velocity = encoreSparks.velocities[index];
    positions.setXYZ(
      index,
      positions.getX(index) + velocity.x * delta,
      positions.getY(index) + velocity.y * delta,
      positions.getZ(index) + velocity.z * delta,
    );
    velocity.y -= 3.4 * delta;
    const fade = Math.min(1, encoreSparks.life[index] / 0.22);
    colors.setXYZ(
      index,
      encoreSparks.baseColors[index * 3] * fade,
      encoreSparks.baseColors[index * 3 + 1] * fade,
      encoreSparks.baseColors[index * 3 + 2] * fade,
    );
  }
  positions.needsUpdate = true;
  colors.needsUpdate = true;
}

function resetEncoreSparks() {
  if (!encoreSparks) return;
  const positions = encoreSparks.points.geometry.getAttribute("position");
  encoreSparks.life.fill(0);
  for (let index = 0; index < ENCORE_SPARK_COUNT; index += 1) {
    positions.setY(index, -50);
  }
  positions.needsUpdate = true;
  encoreSparks.cursor = 0;
}

function createForestAtmosphere() {
  const fogCanvas = document.createElement("canvas");
  fogCanvas.width = 256;
  fogCanvas.height = 128;
  const fogContext = fogCanvas.getContext("2d");
  const fogGradient = fogContext.createRadialGradient(128, 64, 5, 128, 64, 120);
  fogGradient.addColorStop(0, "rgba(164, 225, 205, 0.58)");
  fogGradient.addColorStop(0.5, "rgba(73, 130, 111, 0.22)");
  fogGradient.addColorStop(1, "rgba(12, 35, 28, 0)");
  fogContext.fillStyle = fogGradient;
  fogContext.fillRect(0, 0, 256, 128);
  const fogTexture = new THREE.CanvasTexture(fogCanvas);

  [1, 8, 15, 22, 29, 36, 43, 50, 57, 64].forEach((x, index) => {
    const material = new THREE.SpriteMaterial({
      map: fogTexture,
      color: index % 2 === 0 ? 0x8fd3bd : 0x739e91,
      transparent: true,
      opacity: 0.075,
      depthWrite: false,
    });
    const fog = new THREE.Sprite(material);
    fog.position.set(x, -0.65 + (index % 2) * 0.28, -2.9 - (index % 3) * 0.35);
    fog.scale.set(10.5 + (index % 2) * 2, 2.55, 1);
    fog.userData.baseX = x;
    fog.userData.phase = index * 1.2;
    scene.add(fog);
    atmosphere.fog.push(fog);
  });

  [8.8, 20.5, 29.2, 38.5, 48, 58].forEach((x, index) => {
    const color = index === 1 ? 0x9cebd0 : 0xb7dff4;
    const light = new THREE.PointLight(color, 7 + index, 7, 2);
    light.position.set(x, 2.7 + (index % 2) * 0.45, 1.5);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 4.8, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.035,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.set(x, 0.72, -0.4);
    beam.rotation.z = index === 1 ? -0.08 : 0.07;
    scene.add(light, beam);
    atmosphere.lights.push({ light, base: 7 + index, phase: index * 1.7 });
  });
  atmosphere.lights.push({ light: neon, base: BASE_GLOW_INTENSITY, phase: 0 });

  const moteCount = 120;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i += 1) {
    motePositions[i * 3] = -7 + Math.random() * 75;
    motePositions[i * 3 + 1] = -1.7 + Math.random() * 7.4;
    motePositions[i * 3 + 2] = -0.8 + Math.random() * 4;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  atmosphere.motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: 0xb0ffd8,
      size: 0.065,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere.motes);
}

function createAtmosphere() {
  const lampBody = mat(0x28354a, 0.72, 0.34);
  const lamps = [
    { x: 13.2, color: 0x3de8ff, intensity: 11, phase: 0.4 },
    { x: 22.4, color: 0xff4ecb, intensity: 9, phase: 1.8 },
    { x: 29.8, color: 0x56dfff, intensity: 10, phase: 3.1 },
    { x: 39.6, color: 0xff63cf, intensity: 9, phase: 4.4 },
  ];

  lamps.forEach(({ x, color, intensity, phase }) => {
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.12, 0.22),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 1.65,
        roughness: 0.34,
      }),
    );
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.75, 0.08), lampBody);
    fixture.position.set(x, 3.15, 0.75);
    bracket.position.set(x, 3.48, 0.62);
    const light = new THREE.PointLight(color, intensity, 7, 2);
    light.position.set(x, 2.8, 2.4);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 3.2, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.032,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    beam.position.set(x, 1.52, 0.25);
    scene.add(bracket, fixture, beam, light);
    atmosphere.lights.push({ light, base: intensity, phase });
  });

  atmosphere.lights.push({ light: neon, base: 26, phase: 0 });

  const fogCanvas = document.createElement("canvas");
  fogCanvas.width = 256;
  fogCanvas.height = 128;
  const fogContext = fogCanvas.getContext("2d");
  const fogGradient = fogContext.createRadialGradient(128, 64, 4, 128, 64, 120);
  fogGradient.addColorStop(0, "rgba(126, 205, 224, 0.65)");
  fogGradient.addColorStop(0.5, "rgba(74, 126, 151, 0.22)");
  fogGradient.addColorStop(1, "rgba(21, 42, 63, 0)");
  fogContext.fillStyle = fogGradient;
  fogContext.fillRect(0, 0, 256, 128);
  const fogTexture = new THREE.CanvasTexture(fogCanvas);

  [3, 12, 21, 30, 39, 48].forEach((x, index) => {
    const material = new THREE.SpriteMaterial({
      map: fogTexture,
      color: index % 2 === 0 ? 0x7fcadd : 0x9a7ac0,
      transparent: true,
      opacity: 0.065,
      depthWrite: false,
    });
    const fog = new THREE.Sprite(material);
    fog.position.set(x, -0.55 + (index % 2) * 0.38, -2.8 - (index % 3) * 0.4);
    fog.scale.set(10 + (index % 2) * 2, 2.4, 1);
    fog.userData.baseX = x;
    fog.userData.phase = index * 1.3;
    scene.add(fog);
    atmosphere.fog.push(fog);
  });

  const moteCount = 140;
  const motePositions = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i += 1) {
    motePositions[i * 3] = -8 + Math.random() * 58;
    motePositions[i * 3 + 1] = -1.8 + Math.random() * 8.5;
    motePositions[i * 3 + 2] = -1 + Math.random() * 5;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute("position", new THREE.BufferAttribute(motePositions, 3));
  atmosphere.motes = new THREE.Points(
    moteGeometry,
    new THREE.PointsMaterial({
      color: 0x8fe7f4,
      size: 0.035,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere.motes);
}

function createCheckpoint(checkpointX) {
  const group = new THREE.Group();
  const baseMaterial = mat(0x162333, 0.62, 0.4);
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0x55e7f8,
    emissive: 0x1594a7,
    emissiveIntensity: 1.1,
    roughness: 0.32,
    metalness: 0.28,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x55e7f8,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: 0x55e7f8,
    transparent: true,
    opacity: 0.1,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 16), baseMaterial);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.72, 10), baseMaterial);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 12), glowMaterial);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.024, 8, 42), ringMaterial);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.24, 5.2, 18, 1, true), beamMaterial);
  base.position.y = 0.06;
  pole.position.y = 0.45;
  orb.position.y = 0.88;
  ring.position.y = 0.88;
  ring.rotation.z = 0.18;
  beam.position.y = 3.15;
  beam.renderOrder = 2;
  group.add(base, pole, orb, ring, beam);
  group.position.set(checkpointX, -2, PLAYER_Z - 0.32);
  const light = new THREE.PointLight(0x55e7f8, 3.5, 3.5, 2);
  light.position.set(0, 0.88, 0.45);
  group.add(light);
  scene.add(group);
  checkpoints.push({
    group,
    ring,
    beam,
    glowMaterial,
    ringMaterial,
    beamMaterial,
    light,
    x: checkpointX,
    respawnX: checkpointX + 0.75,
    activated: false,
    activation: 0,
  });
}

function createWorld() {
  if (IS_FOREST) createForest();
  else createCity();
  const { ground, stagePlatform } = ACTIVE_LEVEL;
  addPlatform(ground.x, ground.y, ground.width, ground.height, ground.color);

  ACTIVE_LEVEL.platforms.forEach(({ x, top, width, height, color }) => {
    addPlatform(x, top - height / 2, width, height, color);
  });

  addPlatform(
    STAGE_X,
    stagePlatform.y,
    stagePlatform.width,
    stagePlatform.height,
    stagePlatform.color,
  );
  createStage();
  encoreSparks = createEncoreSparks();
  if (IS_FOREST) createForestAtmosphere();
  else createAtmosphere();
  CHECKPOINTS.forEach(createCheckpoint);
}

function createGuitar() {
  const guitar = new THREE.Group();
  const lacquer = mat(0xb9326e, 0.3, 0.24);
  const edge = mat(0x32131f, 0.55, 0.08);
  const metal = mat(0xb7d8dd, 0.22, 0.82);
  const lower = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 14), lacquer);
  const upper = new THREE.Mesh(new THREE.SphereGeometry(0.23, 20, 14), lacquer);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.82, 0.075), edge);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.095), edge);
  const soundHole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 16), edge);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.035), metal);
  lower.scale.set(0.86, 1.04, 0.32);
  lower.position.y = -0.16;
  upper.scale.set(0.8, 0.9, 0.3);
  upper.position.y = 0.18;
  neck.position.y = 0.69;
  head.position.y = 1.17;
  soundHole.rotation.x = Math.PI / 2;
  soundHole.position.set(0.02, -0.06, 0.105);
  bridge.position.set(0.02, -0.3, 0.11);
  guitar.add(lower, upper, neck, head, soundHole, bridge);
  guitar.rotation.z = 0.38;
  guitar.position.copy(GUITAR_CARRY_POSITION);
  guitar.name = "guitar";
  return guitar;
}

function createPlayer() {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  const coat = mat(0x36536c, 0.7, 0.08);
  const coatDark = mat(0x17293a, 0.82, 0.04);
  const denim = mat(0x2a405c, 0.86, 0.03);
  const skin = mat(0xd49a76, 0.84, 0.01);
  const hairMaterial = mat(0x4a3028, 0.98, 0);
  const boots = mat(0x211a22, 0.72, 0.12);
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x4ccde0,
    emissive: 0x0d7585,
    emissiveIntensity: 0.65,
    roughness: 0.45,
  });
  const magenta = mat(0x8f285e, 0.68, 0.08);

  const guitar = createGuitar();

  const torso = new THREE.Group();
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.31, 0.45, 5, 12), coat);
  chest.scale.set(1, 1.08, 0.72);
  chest.position.y = 0.14;
  const coatSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.37, 0.5, 12), coatDark);
  coatSkirt.position.y = -0.28;
  const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.48, 0.045), cyan);
  lapel.position.set(0.2, 0.15, 0.24);
  lapel.rotation.z = -0.18;
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.055, 7, 16, Math.PI * 1.2), magenta);
  scarf.position.set(0, 0.45, 0.02);
  scarf.rotation.set(Math.PI / 2, 0, -0.35);
  torso.add(chest, coatSkirt, lapel, scarf);

  function createArm(x, z) {
    const arm = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.34, 4, 8), coat);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 9), skin);
    sleeve.position.y = -0.22;
    hand.position.y = -0.49;
    arm.position.set(x, 0.36, z);
    arm.add(sleeve, hand);
    return arm;
  }

  function createLeg(x, z) {
    const leg = new THREE.Group();
    const trouser = new THREE.Mesh(new THREE.CapsuleGeometry(0.115, 0.28, 4, 8), denim);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.22, 0.32), boots);
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.045, 0.34), cyan);
    trouser.position.y = -0.26;
    boot.position.set(0.07, -0.59, 0.035);
    boot.rotation.z = -0.04;
    sole.position.set(0.07, -0.6775, 0.035);
    leg.position.set(x, -0.32, z);
    leg.add(trouser, boot, sole);
    return { leg, boot };
  }

  const backArm = createArm(-0.2, ENCORE_BACK_ARM_START_Z);
  const frontArm = createArm(0.22, 0.27);
  const left = createLeg(-0.14, -0.04);
  const right = createLeg(0.14, 0.18);

  const headRig = new THREE.Group();
  headRig.position.y = 0.71;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.275, 20, 15), skin);
  head.scale.set(0.92, 1.04, 0.9);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 9), skin);
  nose.position.set(0.255, 0.015, 0.01);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.43, 15), hairMaterial);
  beard.position.set(0.1, -0.2, 0.11);
  beard.rotation.z = -0.2;
  beard.name = "beard";
  const moustache = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 3, 7), hairMaterial);
  moustache.position.set(0.205, -0.075, 0.16);
  moustache.rotation.z = Math.PI / 2;
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x9ff7ff });
  const eyeNear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), eyeMaterial);
  const eyeFar = eyeNear.clone();
  eyeNear.position.set(0.205, 0.08, 0.21);
  eyeFar.position.set(0.205, 0.08, -0.21);

  const hair = new THREE.Group();
  [-0.1, 0, 0.1].forEach((x, index) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.25 + index * 0.025, 8), hairMaterial);
    spike.position.set(x, 0.27 + index * 0.015, 0);
    spike.rotation.z = -0.12 - index * 0.05;
    hair.add(spike);
  });
  hair.position.set(-0.025, 0.03, 0);
  headRig.add(head, nose, beard, moustache, eyeNear, eyeFar, hair);

  const coatTailLeft = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.42, 8), coatDark);
  const coatTailRight = coatTailLeft.clone();
  coatTailLeft.position.set(-0.14, -0.49, -0.02);
  coatTailRight.position.set(0.14, -0.49, 0.02);
  coatTailLeft.rotation.z = -0.08;
  coatTailRight.rotation.z = 0.08;

  [guitar, backArm, left.leg, right.leg, torso, coatTailLeft, coatTailRight, headRig, frontArm]
    .forEach((part) => visual.add(part));
  visual.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });

  const rim = new THREE.PointLight(0x79dfff, 1.35, 3.3, 2);
  rim.position.set(-0.25, 0.65, 1.15);
  group.add(visual, rim);
  group.userData.rig = {
    visual,
    torso,
    headRig,
    beard,
    frontArm,
    backArm,
    leftLeg: left.leg,
    rightLeg: right.leg,
    leftBoot: left.boot,
    rightBoot: right.boot,
    coatTailLeft,
    coatTailRight,
    guitar,
    walkTime: 0,
  };
  group.position.set(0, PLAYER_START_Y, PLAYER_Z);
  scene.add(group);
  return group;
}

function addNote(x, y, phase) {
  const group = new THREE.Group();
  const noteMaterial = new THREE.MeshStandardMaterial({
    color: 0xff58cc,
    emissive: 0xff168e,
    emissiveIntensity: 2.2,
    roughness: 0.24,
    metalness: 0.12,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd5f3,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), noteMaterial);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.82, 12), noteMaterial);
  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), highlightMaterial);

  const flagShape = new THREE.Shape();
  flagShape.moveTo(0, 0);
  flagShape.lineTo(0.075, -0.01);
  flagShape.bezierCurveTo(0.38, -0.055, 0.46, -0.25, 0.29, -0.41);
  flagShape.bezierCurveTo(0.3, -0.23, 0.17, -0.16, 0.02, -0.17);
  flagShape.closePath();
  const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape, 18), noteMaterial);

  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff55cf,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.018, 8, 48), haloMaterial);
  const glow = new THREE.PointLight(0xff3fbf, 2.4, 2.2, 2);

  head.scale.set(1.34, 0.74, 0.52);
  head.rotation.z = -0.3;
  head.position.set(-0.055, -0.08, 0);
  stem.position.set(0.19, 0.32, 0);
  flag.position.set(0.19, 0.73, 0.025);
  highlight.scale.set(1.5, 0.62, 0.28);
  highlight.rotation.z = -0.3;
  highlight.position.set(-0.13, -0.025, 0.105);
  halo.position.y = 0.22;
  glow.position.set(0, 0.24, 0.35);

  group.add(head, stem, flag, highlight, halo, glow);
  group.position.set(x, y, PLAYER_Z + 0.1);
  scene.add(group);
  notes.push({
    group,
    phase,
    originY: y,
    collected: false,
    nearCuePlayed: false,
    visuals: [head, stem, flag, highlight, halo],
    material: noteMaterial,
    halo,
    glow,
  });
}

function createNotes() {
  ACTIVE_LEVEL.notes.forEach(({ x, y }, index) => addNote(x, y, index * 1.2));
}

function createShadowCreature(startX, patrolMin, patrolMax, direction = 1) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x100d1d,
    emissive: 0x29104b,
    emissiveIntensity: 0.8,
    roughness: 0.88,
    transparent: true,
    opacity: 0.95,
  });
  const fringeMaterial = new THREE.MeshStandardMaterial({
    color: 0x241039,
    emissive: 0x50136f,
    emissiveIntensity: 0.9,
    roughness: 0.72,
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x9ff7ff });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.25, 5, 12), shadowMaterial);
  body.scale.set(1.08, 0.92, 0.72);
  body.position.y = 0.12;

  const fringe = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.42, 7), fringeMaterial);
  fringe.position.y = -0.21;
  fringe.rotation.y = Math.PI / 7;

  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMaterial);
  const eyeRight = eyeLeft.clone();
  eyeLeft.scale.set(1.5, 0.55, 0.45);
  eyeRight.scale.copy(eyeLeft.scale);
  eyeLeft.position.set(0.25, 0.2, 0.15);
  eyeRight.position.set(0.25, 0.2, -0.15);

  const wisps = [];
  [-0.22, 0, 0.22].forEach((x, index) => {
    const wisp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 7), fringeMaterial);
    wisp.position.set(x, -0.32, (index - 1) * 0.08);
    wisp.rotation.z = (index - 1) * 0.2;
    wisps.push(wisp);
  });

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 20),
    new THREE.MeshBasicMaterial({ color: 0x050208, transparent: true, opacity: 0.62 }),
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.set(0, -SHADOW.height / 2 + 0.012, -0.3);
  groundShadow.scale.set(1.35, 0.7, 1);

  visual.add(body, fringe, eyeLeft, eyeRight, ...wisps);
  visual.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });
  const glow = new THREE.PointLight(0x7b2bbd, 2.4, 2.5, 2);
  glow.position.set(0, 0.1, 0.65);
  group.add(groundShadow, visual, glow);
  group.position.set(startX, -2 + SHADOW.height / 2, PLAYER_Z - 0.03);
  scene.add(group);

  shadows.push({
    group,
    visual,
    eyes: [eyeLeft, eyeRight],
    shadowMaterial,
    fringeMaterial,
    eyeMaterial,
    glow,
    wisps,
    startX,
    patrolMin,
    patrolMax,
    direction,
    initialDirection: direction,
    phase: startX * 0.37,
    stunTime: 0,
    hitFlash: 0,
  });
}

function createShadows() {
  ACTIVE_LEVEL.shadows.forEach(({ startX, patrolMin, patrolMax, direction }) => {
    createShadowCreature(startX, patrolMin, patrolMax, direction);
  });
}

function createPlatformSentinel(startX, platformTop, patrolMin, patrolMax, direction = 1) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x16243e,
    emissive: 0x174d78,
    emissiveIntensity: 1.25,
    roughness: 0.4,
    metalness: 0.48,
    flatShading: true,
  });
  const accentMaterial = new THREE.MeshBasicMaterial({
    color: 0xff58d0,
    transparent: true,
    opacity: 0.82,
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xa8f8ff });

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.29, 0), shellMaterial);
  core.scale.set(1.05, 0.88, 0.72);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 7, 36), accentMaterial);
  ring.rotation.y = 0.42;

  const leftFin = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 3), shellMaterial);
  const rightFin = leftFin.clone();
  leftFin.position.x = -0.34;
  rightFin.position.x = 0.34;
  leftFin.rotation.z = -Math.PI / 2;
  rightFin.rotation.z = Math.PI / 2;

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMaterial);
  eye.scale.set(1.45, 0.52, 0.42);
  eye.position.set(0.08, 0.03, 0.23);

  const groundShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 18),
    new THREE.MeshBasicMaterial({ color: 0x04050b, transparent: true, opacity: 0.5 }),
  );
  groundShadow.rotation.x = -Math.PI / 2;
  groundShadow.position.set(0, -PLATFORM_SENTINEL.height / 2 + 0.01, -0.24);
  groundShadow.scale.set(1.25, 0.62, 1);

  visual.add(core, ring, leftFin, rightFin, eye);
  visual.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });

  const glow = new THREE.PointLight(0x4bdfff, 3.2, 3, 2);
  glow.position.set(0, 0.08, 0.55);
  group.add(groundShadow, visual, glow);
  group.position.set(startX, platformTop + PLATFORM_SENTINEL.height / 2, PLAYER_Z - 0.02);
  scene.add(group);

  platformSentinels.push({
    group,
    visual,
    ring,
    fins: [leftFin, rightFin],
    shellMaterial,
    accentMaterial,
    eyeMaterial,
    glow,
    startX,
    baseY: group.position.y,
    patrolMin,
    patrolMax,
    direction,
    initialDirection: direction,
    phase: startX * 0.41,
    stunTime: 0,
    hitFlash: 0,
  });
}

function createPlatformSentinels() {
  ACTIVE_LEVEL.platformSentinels.forEach(
    ({ startX, platformTop, patrolMin, patrolMax, direction }) => {
      createPlatformSentinel(startX, platformTop, patrolMin, patrolMax, direction);
    },
  );
}

function createSilenceMoth(spec) {
  const group = new THREE.Group();
  const visual = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x25162e,
    emissive: 0x7d2d91,
    emissiveIntensity: 0.9,
    roughness: 0.72,
  });
  const wingMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a3a72,
    emissive: 0xb64dbe,
    emissiveIntensity: 0.72,
    transparent: true,
    opacity: 0.9,
    roughness: 0.58,
    side: THREE.DoubleSide,
  });
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xc4fff0 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.42, 4, 9), bodyMaterial);
  body.rotation.z = Math.PI / 2;
  const leftWing = new THREE.Mesh(new THREE.CircleGeometry(0.42, 18), wingMaterial);
  const rightWing = leftWing.clone();
  leftWing.scale.set(1.25, 0.72, 1);
  rightWing.scale.copy(leftWing.scale);
  leftWing.position.set(-0.35, 0.18, -0.02);
  rightWing.position.set(0.35, 0.18, -0.02);
  leftWing.rotation.z = -0.42;
  rightWing.rotation.z = 0.42;
  const eyeLeft = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), eyeMaterial);
  const eyeRight = eyeLeft.clone();
  eyeLeft.position.set(-0.12, -0.02, 0.17);
  eyeRight.position.set(0.12, -0.02, 0.17);
  const warningMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7bda,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const warningRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 8, 48), warningMaterial);
  warningRing.position.z = -0.08;
  const glow = new THREE.PointLight(0xd45ad6, 0, 4.5, 2);
  glow.position.z = 0.55;
  visual.add(leftWing, rightWing, body, eyeLeft, eyeRight);
  visual.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });
  group.add(warningRing, visual, glow);
  group.position.set(spec.startX, spec.y, PLAYER_Z + 0.05);
  group.visible = false;
  scene.add(group);
  silenceMoths.push({
    ...spec,
    group,
    visual,
    wings: [leftWing, rightWing],
    bodyMaterial,
    wingMaterial,
    warningMaterial,
    warningRing,
    glow,
    state: "waiting",
    timer: 0,
    stunTime: 0,
    hitFlash: 0,
    isMoth: true,
  });
}

function createSilenceMoths() {
  ACTIVE_LEVEL.silenceMoths.forEach(createSilenceMoth);
}

function resetSilenceMoth(moth) {
  moth.state = "waiting";
  moth.timer = 0;
  moth.stunTime = 0;
  moth.hitFlash = 0;
  moth.group.visible = false;
  moth.group.position.set(moth.startX, moth.y, PLAYER_Z + 0.05);
  moth.group.rotation.set(0, 0, 0);
  moth.visual.scale.set(1, 1, 1);
  moth.warningMaterial.opacity = 0;
  moth.glow.intensity = 0;
}

function updateSilenceMoths(delta, elapsed) {
  silenceMoths.forEach((moth) => {
    if (
      moth.state === "waiting"
      && started
      && !completed
      && !defeated
      && player.position.x >= moth.triggerX
      && player.position.x < moth.startX - 0.65
    ) {
      moth.state = "warning";
      moth.timer = moth.warningDuration;
      moth.group.visible = true;
      showGuidance(
        "Wing-glow means a Silence Moth is about to fly low. Jump it or use a sound wave.",
        "New threat",
        5200,
      );
      tone(176, 0.16, 0, "sine", 0.045);
      tone(132, 0.24, 0.12, "triangle", 0.04);
    }

    if (!moth.group.visible) return;
    moth.hitFlash = Math.max(0, moth.hitFlash - delta);
    const wingBeat = Math.sin(elapsed * (moth.state === "flying" ? 18 : 9));
    moth.wings[0].rotation.z = -0.42 - Math.abs(wingBeat) * 0.62;
    moth.wings[1].rotation.z = 0.42 + Math.abs(wingBeat) * 0.62;
    moth.visual.position.y = Math.sin(elapsed * 6.2) * 0.045;

    if (moth.stunTime > 0 && moth.state !== "diverted" && moth.state !== "done") {
      moth.state = "diverted";
      moth.warningMaterial.opacity = 0;
      moth.glow.color.set(0x65efff);
      tone(587, 0.22, 0, "triangle", 0.075);
      ui.mission.textContent = "The sound wave turns the Silence Moth away from the trail.";
    }

    if (moth.state === "warning") {
      moth.timer -= delta;
      const warningProgress = 1 - moth.timer / moth.warningDuration;
      const pulse = (Math.sin(elapsed * 15) + 1) / 2;
      moth.warningRing.scale.setScalar(0.82 + warningProgress * 0.34 + pulse * 0.08);
      moth.warningMaterial.opacity = 0.22 + warningProgress * 0.48 + pulse * 0.18;
      moth.glow.intensity = 3 + warningProgress * 7 + pulse * 2;
      moth.bodyMaterial.emissiveIntensity = 0.9 + warningProgress * 2.4;
      moth.wingMaterial.emissiveIntensity = 0.72 + warningProgress * 2;
      if (moth.timer <= 0) {
        moth.state = "flying";
        moth.warningMaterial.opacity = 0;
        moth.glow.intensity = 7;
        tone(98, 0.32, 0, "sawtooth", 0.055);
      }
      return;
    }

    if (moth.state === "diverted") {
      moth.stunTime = Math.max(0, moth.stunTime - delta);
      moth.group.position.x += moth.direction * moth.speed * 0.32 * delta;
      moth.group.position.y += 3.3 * delta;
      moth.group.rotation.z += moth.direction * 2.4 * delta;
      moth.visual.scale.multiplyScalar(1 - delta * 0.2);
      if (moth.group.position.y > 5.2) {
        moth.state = "done";
        moth.group.visible = false;
      }
      return;
    }

    if (moth.state !== "flying" || completed || defeated) return;
    moth.group.position.x += moth.direction * moth.speed * delta;
    moth.group.position.y = moth.y + Math.sin(elapsed * 14) * 0.06;
    moth.visual.rotation.z = moth.direction * -0.08;
    moth.glow.intensity = 5.5 + Math.abs(wingBeat) * 2;

    const playerLeft = player.position.x - PLAYER.width / 2;
    const playerRight = player.position.x + PLAYER.width / 2;
    const playerBottom = player.position.y - PLAYER.height / 2;
    const playerTop = player.position.y + PLAYER.height / 2;
    const mothLeft = moth.group.position.x - SILENCE_MOTH.width / 2;
    const mothRight = moth.group.position.x + SILENCE_MOTH.width / 2;
    const mothBottom = moth.group.position.y - SILENCE_MOTH.height / 2;
    const mothTop = moth.group.position.y + SILENCE_MOTH.height / 2;
    if (
      playerRight > mothLeft
      && playerLeft < mothRight
      && playerTop > mothBottom
      && playerBottom < mothTop
    ) {
      takeDamage(moth);
    }

    const passedEnd = moth.direction < 0
      ? moth.group.position.x <= moth.endX
      : moth.group.position.x >= moth.endX;
    if (passedEnd) {
      moth.state = "done";
      moth.group.visible = false;
    }
  });
}

function createRain() {
  const dropCount = 280;
  const positions = new Float32Array(dropCount * 2 * 3);
  for (let i = 0; i < dropCount; i += 1) {
    const x = -15 + Math.random() * 95;
    const y = -2 + Math.random() * 16;
    const z = -4 + Math.random() * 8;
    const offset = i * 6;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    positions[offset + 3] = x - 0.07;
    positions[offset + 4] = y - 0.32;
    positions[offset + 5] = z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x8ac9dd, transparent: true, opacity: 0.16 }),
  );
  scene.add(rain);
  return rain;
}

createWorld();
const player = createPlayer();
createNotes();
createShadows();
createPlatformSentinels();
createSilenceMoths();
const rain = createRain();
const clock = new THREE.Clock();

function warmAudioEngine() {
  if (!audio || audioWarmupComplete) return;
  audioWarmupComplete = true;

  const start = audio.currentTime;
  ["sine", "triangle", "square", "sawtooth"].forEach((type, index) => {
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(110 + index * 55, start);
    gain.gain.setValueAtTime(0, start);
    oscillator.connect(gain).connect(masterGain || audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.012);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      gain.disconnect();
    }, { once: true });
  });
}

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audio && AudioContextClass) {
    audio = new AudioContextClass();
    masterGain = audio.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audio.destination);
  }
  if (audio && audio.state === "suspended") audio.resume();
  warmAudioEngine();
}

function setVolume(value) {
  masterVolume = THREE.MathUtils.clamp(Number(value) / 100, 0, 1);
  ui.volumeOutput.textContent = masterVolume === 0 ? "Muted" : `${Math.round(masterVolume * 100)}%`;
  if (masterGain && audio) masterGain.gain.setTargetAtTime(masterVolume, audio.currentTime, 0.02);
}

function tone(frequency, duration = 0.18, delay = 0, type = "triangle", volume = 0.12) {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(masterGain || audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function removeSoundWave(wave) {
  scene.remove(wave.group);
  wave.rings.forEach((ring) => {
    ring.geometry.dispose();
    ring.material.dispose();
  });
}

function updateSoundEnergy() {
  ui.energyPips.forEach((pip, index) => pip.classList.toggle("is-filled", index < soundEnergy));
  ui.soundEnergy.setAttribute("aria-label", `${soundEnergy} of ${MAX_SOUND_ENERGY} sound charges`);
  ui.soundControlLabel.textContent = `sound wave · ${soundEnergy}/${MAX_SOUND_ENERGY}`;
  ui.soundEnergy.classList.toggle("is-empty", soundEnergy === 0);
  ui.touchSound.classList.toggle("is-empty", soundEnergy === 0);
  ui.touchSound.setAttribute("aria-label", `Use sound wave, ${soundEnergy} of ${MAX_SOUND_ENERGY} charges available`);
}

function emitSoundWave() {
  if (!started || completed || defeated || paused || soundWaveCooldown > 0) return;
  if (soundEnergy < SOUND_WAVE.cost) {
    ui.mission.textContent = "The guitar is silent. Collect a lost note to recharge the sound wave.";
    ui.soundEnergy.classList.add("is-denied");
    setTimeout(() => ui.soundEnergy.classList.remove("is-denied"), 280);
    tone(78, 0.14, 0, "square");
    return;
  }

  soundEnergy -= SOUND_WAVE.cost;
  soundWavesUsed += 1;
  updateSoundEnergy();

  const group = new THREE.Group();
  const rings = [0, 0.12].map((delay, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0x65efff : 0xff55cf,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, index === 0 ? 0.045 : 0.028, 8, 72), material);
    ring.userData.delay = delay;
    ring.renderOrder = 8;
    group.add(ring);
    return ring;
  });
  group.position.set(player.position.x, player.position.y, PLAYER_Z + 0.7);
  scene.add(group);
  soundWaves.push({ group, rings, age: 0 });
  soundWaveCooldown = SOUND_WAVE.cooldown;

  let hits = 0;
  const stunTarget = (target) => {
    if (target.isMoth && !target.group.visible) return;
    const dx = target.group.position.x - player.position.x;
    const dy = target.group.position.y - player.position.y;
    if (Math.hypot(dx, dy) > SOUND_WAVE.range) return;
    target.stunTime = SOUND_WAVE.stun;
    target.hitFlash = 0.35;
    hits += 1;
  };
  shadows.forEach(stunTarget);
  platformSentinels.forEach(stunTarget);
  silenceMoths.forEach(stunTarget);

  tone(147, 0.34, 0, "sawtooth");
  tone(294, 0.3, 0.035, "triangle");
  if (hits > 0) {
    tone(523, 0.18, 0.08, "square");
    ui.mission.textContent = hits === 1
      ? "The sound wave stunned a silence creature. Move while the path is open."
      : `The sound wave stunned ${hits} silence creatures. Move while the path is open.`;
  } else {
    ui.mission.textContent = ACTIVE_LEVEL.emptyWaveText;
  }
}

function updateSoundWaves(delta) {
  soundWaveCooldown = Math.max(0, soundWaveCooldown - delta);
  ui.soundControl.classList.toggle("is-cooling", soundWaveCooldown > 0);
  ui.soundControl.classList.toggle("is-ready", soundWaveCooldown === 0 && soundEnergy > 0);
  ui.soundControl.classList.toggle("is-empty", soundEnergy === 0);
  ui.touchSound.classList.toggle("is-cooling", soundWaveCooldown > 0);

  for (let index = soundWaves.length - 1; index >= 0; index -= 1) {
    const wave = soundWaves[index];
    wave.age += delta;
    wave.rings.forEach((ring) => {
      const progress = THREE.MathUtils.clamp(
        (wave.age - ring.userData.delay) / (SOUND_WAVE.duration - ring.userData.delay),
        0,
        1,
      );
      const eased = 1 - (1 - progress) ** 2;
      const scale = THREE.MathUtils.lerp(0.12, SOUND_WAVE.range, eased);
      ring.visible = wave.age >= ring.userData.delay;
      ring.scale.setScalar(scale);
      ring.material.opacity = (1 - progress) * 0.82;
    });

    if (wave.age >= SOUND_WAVE.duration) {
      removeSoundWave(wave);
      soundWaves.splice(index, 1);
    }
  }
}

function solo() {
  encoreSoloNoteIndex = 0;
}

function encoreNotePulse(soloTime, note) {
  const age = soloTime - note.time;
  if (age < 0 || age > 0.24) return 0;
  return Math.sin((age / 0.24) * Math.PI);
}

function updateEncoreSolo(sequenceTime, guitar) {
  const soloTime = sequenceTime - ENCORE_SOLO_START;
  while (
    encoreSoloNoteIndex < ENCORE_SOLO_NOTES.length
    && soloTime >= ENCORE_SOLO_NOTES[encoreSoloNoteIndex].time
  ) {
    const note = ENCORE_SOLO_NOTES[encoreSoloNoteIndex];
    tone(note.frequency, 0.32, 0, note.type, note.frequency === 784 ? 0.16 : 0.12);
    guitar.getWorldPosition(encoreSparkOrigin);
    burstEncoreSparks(encoreSparkOrigin, note.color);
    encoreSoloNoteIndex += 1;
  }
  return soloTime;
}

function updateHealth() {
  ui.healthHearts.forEach((heart, index) => heart.classList.toggle("is-lost", index >= health));
  ui.health.setAttribute("aria-label", `${health} ${health === 1 ? "heart" : "hearts"} remaining`);
}

function placePlayer(x, cameraX = THREE.MathUtils.clamp(x + 2, 0, CAMERA_MAX_X)) {
  velocityY = 0;
  onGround = false;
  landingBounce = 0;
  player.position.set(x, PLAYER_START_Y, PLAYER_Z);
  player.rotation.set(0, 0, 0);
  camera.position.x = cameraX;
  camera.lookAt(cameraX, 0.7, 0);
  const { visual, guitar, frontArm, backArm, headRig } = player.userData.rig;
  player.userData.rig.walkTime = 0;
  visual.position.set(0, 0, 0);
  visual.rotation.set(0, 0, 0);
  visual.scale.set(1, 1, 1);
  visual.visible = true;
  headRig.rotation.set(0, 0, 0);
  backArm.position.z = ENCORE_BACK_ARM_START_Z;
  [frontArm, backArm].forEach((arm) => {
    arm.rotation.set(0, 0, 0);
    arm.scale.set(1, 1, 1);
  });
  guitar.position.copy(GUITAR_CARRY_POSITION);
  guitar.rotation.set(0, 0, 0.38);
}

function restoreNotes(noteStates = null) {
  notes.forEach((note, index) => {
    note.collected = noteStates ? noteStates[index] : false;
    note.group.visible = true;
    note.visuals.forEach((visual) => {
      visual.visible = !note.collected;
    });
    note.group.position.y = note.originY;
    note.group.scale.setScalar(1);
    note.nearCuePlayed = false;
    note.material.emissiveIntensity = 2.2;
    note.halo.material.opacity = 0.12;
    note.halo.scale.setScalar(1);
    note.glow.intensity = note.collected ? 0 : 2.4;
    note.glow.distance = 2.2;
  });
}

function resetStageLighting() {
  stageLights.forEach(({ light }) => {
    light.intensity = 0;
  });
  stageLightBeams.forEach(({ beam, fixtureMaterial }) => {
    beam.material.opacity = 0;
    fixtureMaterial.emissiveIntensity = 0.18;
  });
  neon.intensity = BASE_GLOW_INTENSITY;
  scene.background.copy(nightBackground);
  resetEncoreSparks();
}

function resetThreats() {
  shadows.forEach((shadow) => {
    shadow.group.position.x = shadow.startX;
    shadow.direction = shadow.initialDirection;
    shadow.stunTime = 0;
    shadow.hitFlash = 0;
  });
  platformSentinels.forEach((sentinel) => {
    sentinel.group.position.set(sentinel.startX, sentinel.baseY, PLAYER_Z - 0.02);
    sentinel.visual.position.y = 0;
    sentinel.visual.scale.set(1, 1, 1);
    sentinel.direction = sentinel.initialDirection;
    sentinel.stunTime = 0;
    sentinel.hitFlash = 0;
  });
  silenceMoths.forEach(resetSilenceMoth);
  soundWaves.splice(0).forEach(removeSoundWave);
}

function activateCheckpoint(checkpoint) {
  checkpoint.activated = true;
  checkpointState = {
    checkpoint,
    collected,
    soundEnergy,
    soundWavesUsed,
    notes: notes.map((note) => note.collected),
  };
  health = MAX_HEALTH;
  updateHealth();
  ui.retry.textContent = "Return to checkpoint";
  ui.mission.textContent = "The sound beacon remembers your progress. Your rhythm is restored.";
  showCheckpointNotice();
  tone(220, 0.22, 0, "sine", 0.06);
  tone(330, 0.24, 0.08, "triangle", 0.055);
  tone(440, 0.28, 0.16, "sine", 0.05);
}

function updateCheckpoints(elapsed) {
  checkpoints.forEach((checkpoint) => {
    if (
      started
      && !completed
      && !defeated
      && !checkpoint.activated
      && Math.abs(player.position.x - checkpoint.x) < 1.05
    ) {
      activateCheckpoint(checkpoint);
    }

    const target = checkpoint.activated ? 1 : 0;
    checkpoint.activation = THREE.MathUtils.lerp(checkpoint.activation, target, 0.08);
    const pulse = (Math.sin(elapsed * (checkpoint.activated ? 4.2 : 2.1)) + 1) / 2;
    checkpoint.ring.rotation.y = elapsed * (checkpoint.activated ? 1.15 : 0.45);
    checkpoint.ring.scale.setScalar(1 + pulse * (checkpoint.activated ? 0.16 : 0.06));
    checkpoint.ringMaterial.opacity = 0.34 + pulse * 0.16 + checkpoint.activation * 0.2;
    checkpoint.ringMaterial.color.set(checkpoint.activated ? 0xff67d2 : 0x55e7f8);
    checkpoint.beamMaterial.color.set(checkpoint.activated ? 0xff67d2 : 0x55e7f8);
    checkpoint.beamMaterial.opacity = 0.07 + pulse * 0.055 + checkpoint.activation * 0.07;
    checkpoint.beam.scale.set(1 + pulse * 0.12, 1, 1 + pulse * 0.12);
    checkpoint.glowMaterial.emissive.set(checkpoint.activated ? 0xb52383 : 0x1594a7);
    checkpoint.glowMaterial.emissiveIntensity = 1.1 + checkpoint.activation * 2.3 + pulse * 0.35;
    checkpoint.light.color.set(checkpoint.activated ? 0xff67d2 : 0x55e7f8);
    checkpoint.light.intensity = 3.5 + checkpoint.activation * 7 + pulse * 0.8;
  });
}

function respawnAtCheckpoint() {
  if (!checkpointState) {
    reset();
    return;
  }

  completed = false;
  defeated = false;
  collected = checkpointState.collected;
  health = MAX_HEALTH;
  soundEnergy = checkpointState.soundEnergy;
  soundWavesUsed = checkpointState.soundWavesUsed;
  invulnerabilityTime = 1;
  soundWaveCooldown = 0;
  paused = false;
  hideCheckpointNotice();
  placePlayer(checkpointState.checkpoint.respawnX);
  restoreNotes(checkpointState.notes);
  resetThreats();
  resetStageLighting();
  ui.noteCount.textContent = `${collected} / ${TOTAL_NOTES}`;
  updateHealth();
  updateSoundEnergy();
  ui.mission.textContent = "The sound beacon brings you back. The next shadow is ahead.";
  showGuidance("You kept the notes and sound charges saved at the beacon.", "Checkpoint", 4200);
  ui.encore.hidden = true;
  ui.gameOver.hidden = true;
  ui.pauseMenu.hidden = true;
  ui.pauseButton.hidden = false;
  ui.pauseButton.setAttribute("aria-pressed", "false");
  ui.game.classList.add("is-active");
  ui.game.classList.remove("is-paused");
  ui.game.classList.remove("is-hit");
  tone(165, 0.3, 0, "sine", 0.05);
  tone(330, 0.34, 0.1, "triangle", 0.045);
  clock.start();
}

function defeat() {
  defeated = true;
  keys.clear();
  releaseTouchMovement();
  velocityY = 0;
  player.userData.rig.visual.visible = true;
  ui.mission.textContent = checkpointState
    ? "The silence broke your rhythm. The sound beacon is still listening."
    : "The silence caught the last beat. Try the street again.";
  ui.gameOverScore.textContent = checkpointState
    ? `The beacon remembers ${checkpointState.collected} of ${TOTAL_NOTES} lost notes.`
    : `You recovered ${collected} of ${TOTAL_NOTES} lost notes before the silence closed in.`;
  ui.retry.textContent = checkpointState ? "Return to checkpoint" : "Try again";
  ui.pauseButton.hidden = true;
  ui.game.classList.remove("is-active", "is-paused");
  hideGuidance();
  hideCheckpointNotice();
  tone(110, 0.38, 0, "sawtooth");
  tone(73, 0.58, 0.2, "triangle");
  setTimeout(() => {
    if (defeated) ui.gameOver.hidden = false;
  }, 420);
}

function takeDamage(shadow) {
  if (invulnerabilityTime > 0 || defeated) return;

  health -= 1;
  invulnerabilityTime = DAMAGE.invulnerability;
  updateHealth();
  const side = Math.sign(player.position.x - shadow.group.position.x) || -shadow.direction;
  player.position.x = THREE.MathUtils.clamp(
    shadow.group.position.x + side * DAMAGE.knockback,
    -1.5,
    LEVEL_MAX_X,
  );
  velocityY = DAMAGE.bounce;
  onGround = false;
  ui.game.classList.add("is-hit");
  setTimeout(() => ui.game.classList.remove("is-hit"), 180);
  tone(98, 0.2, 0, "sawtooth");
  tone(65, 0.28, 0.07, "square");

  if (health === 0) {
    defeat();
  } else {
    ui.mission.textContent = `${health} ${health === 1 ? "beat remains" : "beats remain"}. You are briefly protected — move!`;
  }
}

function reset() {
  clearTimeout(nextTransitionTimer);
  nextTransitionTimer = null;
  transitioningToNext = false;
  ui.continueJourney.disabled = false;
  ui.game.classList.remove("is-transitioning");
  ui.nextLocation.hidden = true;
  completed = false;
  defeated = false;
  collected = 0;
  health = MAX_HEALTH;
  soundEnergy = STARTING_SOUND_ENERGY;
  soundWavesUsed = 0;
  checkpointState = null;
  invulnerabilityTime = 0;
  soundWaveCooldown = 0;
  exitHintShown = false;
  paused = false;
  gameTime = 0;
  keys.clear();
  releaseTouchMovement();
  hideCheckpointNotice();
  placePlayer(0, 0);
  restoreNotes();
  resetThreats();
  checkpoints.forEach((checkpoint) => {
    checkpoint.activated = false;
    checkpoint.activation = 0;
  });
  resetStageLighting();
  ui.noteCount.textContent = `0 / ${TOTAL_NOTES}`;
  updateHealth();
  updateSoundEnergy();
  ui.mission.textContent = ACTIVE_LEVEL.missionText;
  ui.encore.hidden = true;
  ui.gameOver.hidden = true;
  ui.pauseMenu.hidden = true;
  ui.pauseButton.hidden = false;
  ui.pauseButton.setAttribute("aria-pressed", "false");
  ui.checkpointButton.hidden = true;
  ui.retry.textContent = "Try again";
  ui.game.classList.add("is-active");
  ui.game.classList.remove("is-hit", "is-paused");
  clock.start();
}

function calculateFinalScore() {
  const notePoints = collected * LEVEL_SCORE.note;
  const rhythmPoints = health * LEVEL_SCORE.health;
  const fullSetBonus = collected === TOTAL_NOTES ? LEVEL_SCORE.allNotesBonus : 0;
  return {
    notePoints,
    rhythmPoints,
    fullSetBonus,
    total: notePoints + rhythmPoints + fullSetBonus,
  };
}

function finish() {
  if (completed) return;
  completed = true;
  velocityY = 0;
  keys.clear();
  releaseTouchMovement();
  encoreStartTime = gameTime;
  encoreSoloStarted = false;
  encoreSoloNoteIndex = 0;
  const { visual, guitar, frontArm, backArm } = player.userData.rig;
  visual.visible = true;
  encoreEntryYaw = player.rotation.y;
  encoreEntryLean = visual.rotation.z;
  encoreEntryGuitarRoll = guitar.rotation.z;
  encoreEntryShoulders.back.copy(backArm.quaternion);
  encoreEntryShoulders.front.copy(frontArm.quaternion);
  resetStageLighting();
  ui.mission.textContent = ACTIVE_LEVEL.completeMission;
  hideGuidance();
  hideCheckpointNotice();
  ui.pauseButton.hidden = true;
  ui.game.classList.remove("is-active", "is-paused");
  const score = calculateFinalScore();
  const missingNotes = TOTAL_NOTES - collected;
  ui.encoreScore.textContent = collected === TOTAL_NOTES
    ? `Every lost note reached the ${ACTIVE_LEVEL.noteDestination}.`
    : `You carried ${collected} of ${TOTAL_NOTES} lost notes to the ${ACTIVE_LEVEL.noteDestination}.`;
  ui.encoreTotalScore.textContent = score.total.toLocaleString("en-GB");
  ui.encoreNotes.textContent = `${collected} / ${TOTAL_NOTES}`;
  ui.encoreNotePoints.textContent = `+${score.notePoints.toLocaleString("en-GB")} pts`;
  ui.encoreRhythm.textContent = `${health} / ${MAX_HEALTH}`;
  ui.encoreRhythmPoints.textContent = `+${score.rhythmPoints.toLocaleString("en-GB")} pts`;
  ui.encoreWaves.textContent = soundWavesUsed.toString();
  ui.encoreBonus.classList.toggle("is-earned", score.fullSetBonus > 0);
  ui.encoreBonus.textContent = score.fullSetBonus > 0
    ? `Perfect collection · +${score.fullSetBonus} full-set bonus`
    : `${missingNotes} ${missingNotes === 1 ? "note" : "notes"} still missing · collect all ${TOTAL_NOTES} for a +${LEVEL_SCORE.allNotesBonus} bonus`;
  ui.nextLocationScore.textContent = `${ACTIVE_LEVEL.resultMemory}: ${score.total.toLocaleString("en-GB")} points.`;
}

function showNextLocation() {
  if (!NEXT_LEVEL || !completed || transitioningToNext || !ui.nextLocation.hidden) return;
  transitioningToNext = true;
  ui.continueJourney.disabled = true;
  ui.game.classList.add("is-transitioning");
  nextTransitionTimer = setTimeout(() => {
    ui.encore.hidden = true;
    ui.nextLocation.hidden = false;
    ui.game.classList.remove("is-transitioning");
    transitioningToNext = false;
    ui.nextLocation.focus();
    tone(147, 0.46, 0, "sine", 0.045);
    tone(220, 0.52, 0.12, "triangle", 0.035);
  }, 560);
}

function updatePlayer(delta) {
  if (!started || completed || defeated) return;
  invulnerabilityTime = Math.max(0, invulnerabilityTime - delta);
  player.userData.rig.visual.visible = invulnerabilityTime === 0
    || Math.floor(invulnerabilityTime * 14) % 2 === 0;
  const direction = Number(keys.has("ArrowRight") || keys.has("KeyD"))
    - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  if (direction) facing = direction;
  player.position.x = THREE.MathUtils.clamp(
    player.position.x + direction * PLAYER.speed * delta,
    -1.5,
    LEVEL_MAX_X,
  );
  if (!exitHintShown && player.position.x > EXIT_HINT_X) {
    exitHintShown = true;
    showGuidance(ACTIVE_LEVEL.exitGuidance, ACTIVE_LEVEL.exitGuidanceLabel, 6000);
  }
  player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, facing === 1 ? 0 : Math.PI, 0.2);

  const previousY = player.position.y;
  velocityY -= GRAVITY * delta;
  player.position.y += velocityY * delta;
  onGround = false;
  const previousBottom = previousY - PLAYER.height / 2;
  const currentBottom = player.position.y - PLAYER.height / 2;

  if (velocityY <= 0) {
    for (const platform of platforms) {
      const top = platform.y + platform.height / 2;
      const overlap = player.position.x + PLAYER.width / 2 > platform.x - platform.width / 2
        && player.position.x - PLAYER.width / 2 < platform.x + platform.width / 2;
      if (overlap && previousBottom >= top - 0.14 && currentBottom <= top) {
        landingBounce = Math.min(1, Math.abs(velocityY) / 8);
        player.position.y = top + PLAYER.height / 2;
        velocityY = 0;
        onGround = true;
        break;
      }
    }
  }

  if (player.position.y < -7) {
    player.position.set(Math.max(0, player.position.x - 3), 2, PLAYER_Z);
    velocityY = 0;
  }
  player.position.z = PLAYER_Z;
  animateCharacter(delta, clock.elapsedTime, direction);
  const insideExitDoor = player.position.x >= EXIT_DOOR.minX
    && player.position.x <= EXIT_DOOR.maxX;
  const playerFeet = player.position.y - PLAYER.height / 2;
  const standingOnExitFloor = onGround && Math.abs(playerFeet - EXIT_FLOOR_TOP) < 0.12;
  if (insideExitDoor && standingOnExitFloor) {
    player.position.set(STAGE_X, EXIT_FLOOR_TOP + PLAYER.height / 2, PLAYER_Z);
    velocityY = 0;
    onGround = true;
    finish();
  }
}

function animateCharacter(delta, elapsed, direction) {
  const rig = player.userData.rig;
  const moving = Math.abs(direction) > 0 && onGround;
  if (moving) rig.walkTime += delta * 10.5;
  const step = moving ? Math.sin(rig.walkTime) : 0;
  const stepLift = moving ? Math.abs(Math.cos(rig.walkTime)) : 0;
  const idle = Math.sin(elapsed * 2.1);
  const airborne = !onGround;
  const targetLean = airborne
    ? THREE.MathUtils.clamp(-velocityY * 0.012, -0.12, 0.11)
    : direction * -0.045;

  landingBounce = Math.max(0, landingBounce - delta * 4.8);
  rig.visual.rotation.z = THREE.MathUtils.lerp(rig.visual.rotation.z, targetLean, 0.14);
  rig.visual.position.y = moving ? stepLift * 0.025 : idle * 0.012;
  rig.visual.scale.x = 1 + landingBounce * 0.065;
  rig.visual.scale.y = 1 - landingBounce * 0.075;

  const leftLegTarget = airborne ? -0.32 : step * 0.48;
  const rightLegTarget = airborne ? 0.38 : -step * 0.48;
  rig.leftLeg.rotation.z = THREE.MathUtils.lerp(rig.leftLeg.rotation.z, leftLegTarget, 0.22);
  rig.rightLeg.rotation.z = THREE.MathUtils.lerp(rig.rightLeg.rotation.z, rightLegTarget, 0.22);
  rig.leftBoot.rotation.z = THREE.MathUtils.lerp(rig.leftBoot.rotation.z, moving ? -step * 0.16 : -0.04, 0.2);
  rig.rightBoot.rotation.z = THREE.MathUtils.lerp(rig.rightBoot.rotation.z, moving ? step * 0.16 : -0.04, 0.2);

  const armSwing = airborne ? -0.34 : -step * 0.34;
  rig.frontArm.rotation.z = THREE.MathUtils.lerp(rig.frontArm.rotation.z, armSwing, 0.18);
  rig.backArm.rotation.z = THREE.MathUtils.lerp(rig.backArm.rotation.z, -armSwing, 0.18);
  rig.torso.rotation.z = Math.sin(elapsed * 1.7) * 0.008;
  rig.headRig.position.y = 0.71 + (moving ? stepLift * 0.012 : idle * 0.008);
  rig.headRig.rotation.z = idle * 0.012 - rig.visual.rotation.z * 0.35;
  rig.beard.rotation.z = -0.2 - rig.visual.rotation.z * 0.6 + Math.sin(elapsed * 3.2) * 0.015;
  rig.coatTailLeft.rotation.z = -0.08 - direction * (moving ? 0.08 : 0) + Math.sin(elapsed * 4) * 0.025;
  rig.coatTailRight.rotation.z = 0.08 - direction * (moving ? 0.11 : 0) - Math.sin(elapsed * 4) * 0.025;
  rig.guitar.rotation.z = 0.38 - direction * (moving ? 0.025 : 0) + step * 0.018;
}

function updateNotes(elapsed) {
  notes.forEach((note, index) => {
    if (note.collected) return;
    const distance = note.group.position.distanceTo(player.position);
    const proximity = started && !completed && !defeated
      ? THREE.MathUtils.clamp(
        (NOTE_PROXIMITY.radius - distance) / (NOTE_PROXIMITY.radius - NOTE_PROXIMITY.collectRadius),
        0,
        1,
      )
      : 0;
    const pulse = (Math.sin(elapsed * (2.8 + proximity * 2.4) + note.phase) + 1) / 2;
    const response = proximity * (0.72 + pulse * 0.28);

    note.group.rotation.y = elapsed * (1.7 + proximity * 1.15) + note.phase;
    note.group.position.y = note.originY + Math.sin(elapsed * 2.1 + note.phase) * (0.1 + proximity * 0.05);
    note.group.scale.setScalar(1 + response * 0.18);
    note.material.emissiveIntensity = 2.2 + response * 3.6;
    note.halo.material.opacity = 0.12 + response * 0.48;
    note.halo.scale.setScalar(1 + response * 0.42);
    note.halo.rotation.z = -elapsed * (0.55 + proximity * 0.8);
    note.glow.intensity = 2.4 + response * 8.5;
    note.glow.distance = 2.2 + response * 2.3;

    if (proximity > 0.28 && !note.nearCuePlayed) {
      note.nearCuePlayed = true;
      tone(220 * 1.075 ** index, 0.16, 0, "sine", 0.035);
      tone(330 * 1.055 ** index, 0.12, 0.045, "triangle", 0.025);
    }

    if (started && !completed && !defeated && distance < NOTE_PROXIMITY.collectRadius) {
      note.collected = true;
      note.visuals.forEach((visual) => {
        visual.visible = false;
      });
      note.glow.intensity = 0;
      collected += 1;
      const previousEnergy = soundEnergy;
      soundEnergy = Math.min(MAX_SOUND_ENERGY, soundEnergy + 1);
      ui.noteCount.textContent = `${collected} / ${TOTAL_NOTES}`;
      updateSoundEnergy();
      if (collected === 1) {
        showGuidance("Lost notes restore one sound-wave charge. You can carry two charges.", "Sound energy", 5000);
      }
      tone(330 * 1.12 ** index, 0.24, 0, "sine");
      tone(495 * 1.08 ** index, 0.18, 0.055, "triangle");
      if (soundEnergy > previousEnergy && collected < TOTAL_NOTES) {
        ui.mission.textContent = "A lost note restored one sound charge.";
      }
      if (collected === TOTAL_NOTES) ui.mission.textContent = "Every lost note is with you. Take them to the stage.";
    }
  });
}

function updateShadows(delta, elapsed) {
  shadows.forEach((shadow) => {
    shadow.stunTime = Math.max(0, shadow.stunTime - delta);
    shadow.hitFlash = Math.max(0, shadow.hitFlash - delta);
    const stunned = shadow.stunTime > 0;

    if (started && !completed && !defeated && !stunned) {
      shadow.group.position.x += shadow.direction * SHADOW.speed * delta;
      if (shadow.group.position.x <= shadow.patrolMin) {
        shadow.group.position.x = shadow.patrolMin;
        shadow.direction = 1;
      } else if (shadow.group.position.x >= shadow.patrolMax) {
        shadow.group.position.x = shadow.patrolMax;
        shadow.direction = -1;
      }
    }

    const pulse = Math.sin(elapsed * 4.2 + shadow.phase);
    shadow.visual.position.y = stunned ? -0.14 : 0.02 + Math.abs(pulse) * 0.02;
    shadow.visual.scale.set(
      stunned ? 1.18 + pulse * 0.025 : 1 + pulse * 0.035,
      stunned ? 0.62 : 1 - pulse * 0.025,
      1,
    );
    shadow.visual.rotation.y = shadow.direction === 1 ? 0 : Math.PI;
    shadow.shadowMaterial.emissiveIntensity = stunned ? 2.8 + shadow.hitFlash * 8 : 0.8;
    shadow.fringeMaterial.emissiveIntensity = stunned ? 3.4 + shadow.hitFlash * 8 : 0.9;
    shadow.eyeMaterial.color.set(stunned ? 0xff71da : 0x9ff7ff);
    shadow.glow.color.set(stunned ? 0x42eaff : 0x7b2bbd);
    shadow.glow.intensity = stunned ? 6 + shadow.hitFlash * 12 : 2.4;
    shadow.eyes.forEach((eye, index) => {
      eye.scale.y = 0.55 + Math.max(0, Math.sin(elapsed * 2.3 + shadow.phase + index * 0.12)) * 0.12;
    });
    shadow.wisps.forEach((wisp, index) => {
      wisp.rotation.z = (index - 1) * 0.2 + Math.sin(elapsed * 5 + shadow.phase + index) * 0.12;
    });

    if (!started || completed || defeated || stunned) return;
    const playerLeft = player.position.x - PLAYER.width / 2;
    const playerRight = player.position.x + PLAYER.width / 2;
    const playerBottom = player.position.y - PLAYER.height / 2;
    const playerTop = player.position.y + PLAYER.height / 2;
    const shadowLeft = shadow.group.position.x - SHADOW.width / 2;
    const shadowRight = shadow.group.position.x + SHADOW.width / 2;
    const shadowBottom = shadow.group.position.y - SHADOW.height / 2;
    const shadowTop = shadow.group.position.y + SHADOW.height / 2;
    const overlaps = playerRight > shadowLeft && playerLeft < shadowRight
      && playerTop > shadowBottom && playerBottom < shadowTop - 0.06;

    if (overlaps) {
      takeDamage(shadow);
    }
  });
}

function updatePlatformSentinels(delta, elapsed) {
  platformSentinels.forEach((sentinel) => {
    sentinel.stunTime = Math.max(0, sentinel.stunTime - delta);
    sentinel.hitFlash = Math.max(0, sentinel.hitFlash - delta);
    const stunned = sentinel.stunTime > 0;

    if (started && !completed && !defeated && !stunned) {
      sentinel.group.position.x += sentinel.direction * PLATFORM_SENTINEL.speed * delta;
      if (sentinel.group.position.x <= sentinel.patrolMin) {
        sentinel.group.position.x = sentinel.patrolMin;
        sentinel.direction = 1;
      } else if (sentinel.group.position.x >= sentinel.patrolMax) {
        sentinel.group.position.x = sentinel.patrolMax;
        sentinel.direction = -1;
      }
    }

    const pulse = Math.sin(elapsed * 5.2 + sentinel.phase);
    sentinel.visual.position.y = stunned ? -0.16 : pulse * 0.07;
    sentinel.visual.rotation.z = stunned ? pulse * 0.08 : pulse * 0.045;
    sentinel.visual.scale.set(
      stunned ? 1.12 : 1 + Math.abs(pulse) * 0.035,
      stunned ? 0.58 : 1 - Math.abs(pulse) * 0.025,
      1,
    );
    sentinel.ring.rotation.z += delta * (stunned ? 0.7 : 2.5);
    sentinel.fins[0].rotation.z = -Math.PI / 2 - pulse * 0.12;
    sentinel.fins[1].rotation.z = Math.PI / 2 + pulse * 0.12;
    sentinel.shellMaterial.emissiveIntensity = stunned ? 2.8 + sentinel.hitFlash * 7 : 1.25;
    sentinel.accentMaterial.color.set(stunned ? 0x62efff : 0xff58d0);
    sentinel.eyeMaterial.color.set(stunned ? 0xff77d9 : 0xa8f8ff);
    sentinel.glow.color.set(stunned ? 0xff55cf : 0x4bdfff);
    sentinel.glow.intensity = stunned ? 5.5 + sentinel.hitFlash * 10 : 3.2;

    if (!started || completed || defeated || stunned) return;
    const centerY = sentinel.group.position.y + sentinel.visual.position.y;
    const playerLeft = player.position.x - PLAYER.width / 2;
    const playerRight = player.position.x + PLAYER.width / 2;
    const playerBottom = player.position.y - PLAYER.height / 2;
    const playerTop = player.position.y + PLAYER.height / 2;
    const sentinelLeft = sentinel.group.position.x - PLATFORM_SENTINEL.width / 2;
    const sentinelRight = sentinel.group.position.x + PLATFORM_SENTINEL.width / 2;
    const sentinelBottom = centerY - PLATFORM_SENTINEL.height / 2;
    const sentinelTop = centerY + PLATFORM_SENTINEL.height / 2;
    const overlaps = playerRight > sentinelLeft && playerLeft < sentinelRight
      && playerTop > sentinelBottom && playerBottom < sentinelTop - 0.04;

    if (overlaps) takeDamage(sentinel);
  });
}

function updateRain(delta) {
  const positions = rain.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 2) {
    const dropIndex = i / 2;
    let x = positions.getX(i) - delta * 1.15;
    let y = positions.getY(i) - delta * (7 + (dropIndex % 5));
    const z = positions.getZ(i);
    if (y < -3) {
      x = camera.position.x - 12 + Math.random() * 30;
      y = 11 + Math.random() * 4;
    }
    positions.setXYZ(i, x, y, z);
    positions.setXYZ(i + 1, x - 0.055, y - 0.32, z);
  }
  positions.needsUpdate = true;
}

function updateAtmosphere(delta, elapsed) {
  atmosphere.lights.forEach(({ light, base, phase }) => {
    light.intensity = base * (0.94 + Math.sin(elapsed * 1.7 + phase) * 0.06);
  });

  atmosphere.fog.forEach((fog) => {
    fog.position.x = fog.userData.baseX + Math.sin(elapsed * 0.18 + fog.userData.phase) * 0.7;
    fog.material.opacity = 0.05 + (Math.sin(elapsed * 0.32 + fog.userData.phase) + 1) * 0.015;
  });

  atmosphere.windows.forEach((windowLight) => {
    windowLight.time -= delta;
    if (windowLight.time <= 0) {
      windowLight.target = windowLight.target === 1 ? 0 : 1;
      windowLight.time = windowLight.target === 1
        ? 5 + Math.random() * 9
        : 4 + Math.random() * 12;
    }
    const transition = 1 - Math.exp(-delta * (windowLight.target === 1 ? 1.8 : 1.15));
    windowLight.level = THREE.MathUtils.lerp(windowLight.level, windowLight.target, transition);
    windowLight.material.color.copy(windowLight.offColor).lerp(windowLight.onColor, windowLight.level * 0.9);
  });

  const positions = atmosphere.motes.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    let x = positions.getX(i) + delta * (0.08 + (i % 3) * 0.025);
    let y = positions.getY(i) + delta * (0.045 + (i % 4) * 0.018);
    if (x < camera.position.x - 12 || x > camera.position.x + 18 || y > 7) {
      x = camera.position.x - 12 + Math.random() * 30;
      y = -2 + Math.random() * 3;
    }
    positions.setXY(i, x, y);
  }
  positions.needsUpdate = true;
}

function aimEncoreArm(arm, start, guitar, grip, reach) {
  encoreArmDirection.copy(grip).applyQuaternion(guitar.quaternion)
    .add(guitar.position)
    .sub(arm.position);
  const length = encoreArmDirection.length();
  encoreArmAim.setFromUnitVectors(ARM_REST_DIRECTION, encoreArmDirection.normalize());
  arm.quaternion.copy(start).slerp(encoreArmAim, reach);
  arm.scale.y = THREE.MathUtils.lerp(1, length / 0.49, reach);
}

function animateEncore(delta, elapsed) {
  if (!completed) return;
  const sequenceTime = Math.max(0, elapsed - encoreStartTime);
  const soloTime = sequenceTime - ENCORE_SOLO_START;
  const overallProgress = THREE.MathUtils.smoothstep(sequenceTime, 0, 1.45);

  stageLights.forEach(({ light, targetIntensity, delay }, index) => {
    const progress = THREE.MathUtils.smoothstep(sequenceTime, delay, delay + 0.48);
    const shimmer = progress > 0
      ? 1 + Math.sin(sequenceTime * 5.2 + index * 1.4) * 0.035
      : 1;
    let notePulse = 0;
    ENCORE_SOLO_NOTES.forEach((note) => {
      if (note.light === index) notePulse = Math.max(notePulse, encoreNotePulse(soloTime, note));
    });
    light.intensity = targetIntensity * progress * shimmer + notePulse * 72;
    const { beam, fixtureMaterial } = stageLightBeams[index];
    beam.material.opacity = progress * (0.075 + Math.sin(sequenceTime * 3.4 + index) * 0.008)
      + notePulse * 0.13;
    fixtureMaterial.emissiveIntensity = 0.18 + progress * 2.5 + notePulse * 2.4;
  });

  neon.intensity = THREE.MathUtils.lerp(
    BASE_GLOW_INTENSITY,
    IS_FOREST ? 38 : 58,
    overallProgress,
  );
  scene.background.copy(nightBackground).lerp(encoreBackground, overallProgress);

  const { visual, guitar, frontArm, backArm, headRig } = player.userData.rig;
  const turn = THREE.MathUtils.smoothstep(sequenceTime, 0, ENCORE_TURN_END);
  const facingAngle = -0.12;
  const facingDelta = THREE.MathUtils.euclideanModulo(facingAngle - encoreEntryYaw + Math.PI, Math.PI * 2) - Math.PI;
  const sideFacing = encoreEntryYaw + facingDelta * turn;
  const headTurn = THREE.MathUtils.smoothstep(
    sequenceTime,
    ENCORE_LIFT_END,
    ENCORE_HEAD_TURN_END,
  );
  player.rotation.y = sideFacing;
  headRig.rotation.y = THREE.MathUtils.lerp(0, -Math.PI / 2 - sideFacing, headTurn);
  visual.rotation.z = THREE.MathUtils.lerp(encoreEntryLean, 0, turn);

  const detach = THREE.MathUtils.smoothstep(sequenceTime, ENCORE_TURN_END, ENCORE_DETACH_END);
  const clear = THREE.MathUtils.smoothstep(sequenceTime, ENCORE_DETACH_END, ENCORE_CLEAR_END);
  const lift = THREE.MathUtils.smoothstep(sequenceTime, ENCORE_CLEAR_END, ENCORE_LIFT_END);
  const reach = THREE.MathUtils.smoothstep(sequenceTime, ENCORE_TURN_END, ENCORE_DETACH_END);
  const support = THREE.MathUtils.smoothstep(sequenceTime, 1.02, ENCORE_LIFT_END);
  const armDepth = THREE.MathUtils.smoothstep(
    sequenceTime,
    ENCORE_TURN_END,
    ENCORE_CLEAR_END,
  );
  backArm.position.z = THREE.MathUtils.lerp(
    ENCORE_BACK_ARM_START_Z,
    ENCORE_BACK_ARM_FRONT_Z,
    armDepth,
  );

  if (sequenceTime < ENCORE_DETACH_END) {
    // Slide the guitar beyond the body silhouette while it is still on the back.
    guitar.position.lerpVectors(GUITAR_CARRY_POSITION, GUITAR_SIDE_BACK_POSITION, detach);
    guitar.rotation.z = THREE.MathUtils.lerp(encoreEntryGuitarRoll, 0.2, detach);
  } else if (sequenceTime < ENCORE_CLEAR_END) {
    // Bring it around the side towards the camera before crossing the torso.
    guitar.position.lerpVectors(GUITAR_SIDE_BACK_POSITION, GUITAR_SIDE_FRONT_POSITION, clear);
    guitar.rotation.z = 0.2;
  } else {
    // The complete swing across the torso now happens in front of the character.
    ENCORE_GUITAR_PATH.getPoint(lift, guitar.position);
    guitar.rotation.z = THREE.MathUtils.lerp(0.2, -1.12, lift);
  }

  let strum = 0;
  if (!encoreSoloStarted && sequenceTime >= ENCORE_SOLO_START) {
    encoreSoloStarted = true;
    solo();
  }
  if (encoreSoloStarted) {
    updateEncoreSolo(sequenceTime, guitar);
    ENCORE_SOLO_NOTES.forEach((note) => {
      strum += encoreNotePulse(soloTime, note) * note.strum;
    });
    guitar.rotation.z += strum * 0.018;
  }

  // Keep the strumming hand on a plane in front of the guitar instead of swinging through its body.
  encoreStringsGrip.copy(GUITAR_STRINGS_GRIP);
  encoreStringsGrip.y += strum * 0.075;
  aimEncoreArm(frontArm, encoreEntryShoulders.front, guitar, GUITAR_NECK_GRIP, reach);
  aimEncoreArm(backArm, encoreEntryShoulders.back, guitar, encoreStringsGrip, support);
  updateEncoreSparks(delta);
  if (sequenceTime >= ENCORE_PANEL_TIME && ui.encore.hidden) {
    ui.encore.hidden = false;
  }
}

function resize() {
  const size = 5.2;
  const aspect = innerWidth / innerHeight;
  camera.left = -size * aspect;
  camera.right = size * aspect;
  camera.top = size;
  camera.bottom = -size;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function jump() {
  if (!started || completed || defeated || paused || !onGround) return;
  velocityY = PLAYER.jump;
  onGround = false;
  tone(165, 0.1, 0, "square");
}

function animate() {
  requestAnimationFrame(animate);
  if (paused) {
    renderer.render(scene, camera);
    return;
  }
  const delta = Math.min(clock.getDelta(), 0.033);
  gameTime += delta;
  const elapsed = gameTime;
  updatePlayer(delta);
  updateNotes(elapsed);
  updateCheckpoints(elapsed);
  updateShadows(delta, elapsed);
  updatePlatformSentinels(delta, elapsed);
  updateSilenceMoths(delta, elapsed);
  updateSoundWaves(delta);
  updateRain(delta);
  const targetX = THREE.MathUtils.clamp(player.position.x + 2, 0, CAMERA_MAX_X);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.055);
  camera.lookAt(camera.position.x, 0.7, 0);
  updateParallax(elapsed);
  updateAtmosphere(delta, elapsed);
  animateEncore(delta, elapsed);
  renderer.render(scene, camera);
}

function releaseTouchMovement() {
  ui.touchMoveButtons.forEach((button) => {
    keys.delete(button.dataset.moveKey);
    button.classList.remove("is-pressed");
  });
}

function bindTouchMovement(button) {
  const code = button.dataset.moveKey;
  const release = () => {
    keys.delete(code);
    button.classList.remove("is-pressed");
  };
  button.addEventListener("pointerdown", (event) => {
    if (!started || completed || defeated || paused) return;
    event.preventDefault();
    ensureAudio();
    keys.add(code);
    button.classList.add("is-pressed");
    button.setPointerCapture?.(event.pointerId);
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
  button.addEventListener("contextmenu", (event) => event.preventDefault());
}

ui.touchMoveButtons.forEach(bindTouchMovement);
ui.touchJump.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  ensureAudio();
  ui.touchJump.classList.add("is-pressed");
  ui.touchJump.setPointerCapture?.(event.pointerId);
  jump();
});
ui.touchJump.addEventListener("pointerup", () => ui.touchJump.classList.remove("is-pressed"));
ui.touchJump.addEventListener("pointercancel", () => ui.touchJump.classList.remove("is-pressed"));
ui.touchJump.addEventListener("lostpointercapture", () => ui.touchJump.classList.remove("is-pressed"));
ui.touchSound.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  ensureAudio();
  ui.touchSound.classList.add("is-pressed");
  ui.touchSound.setPointerCapture?.(event.pointerId);
  emitSoundWave();
});
ui.touchSound.addEventListener("pointerup", () => ui.touchSound.classList.remove("is-pressed"));
ui.touchSound.addEventListener("pointercancel", () => ui.touchSound.classList.remove("is-pressed"));
ui.touchSound.addEventListener("lostpointercapture", () => ui.touchSound.classList.remove("is-pressed"));

addEventListener("keydown", (event) => {
  if (["Escape", "KeyP"].includes(event.code) && !event.repeat) {
    event.preventDefault();
    togglePause();
    return;
  }
  if (paused && event.key === "Tab") {
    trapPauseFocus(event);
    return;
  }
  if (paused) return;
  ensureAudio();
  keys.add(event.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
  if (["Space", "KeyW", "ArrowUp"].includes(event.code) && !event.repeat) jump();
  if (event.code === "KeyE" && !event.repeat) emitSoundWave();
});
addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("blur", () => {
  keys.clear();
  releaseTouchMovement();
  pauseGame();
});
addEventListener("resize", resize);

ui.start.addEventListener("click", () => {
  ensureAudio();
  started = true;
  ui.intro.hidden = true;
  reset();
  showGuidance(
    touchPreferred
      ? "Use the arrows to move, ↑ to jump, and ∿ to spend one sound charge."
      : "Move with A/D, jump with W or Space, and press E to spend one sound charge.",
    "Controls",
    7000,
  );
  tone(110, 0.45, 0, "sine");
});
ui.restart.addEventListener("click", reset);
ui.continueJourney.addEventListener("click", showNextLocation);
ui.nextEnter.addEventListener("click", () => {
  if (!NEXT_LEVEL) return;
  const nextUrl = new URL(window.location.href);
  nextUrl.search = "";
  nextUrl.searchParams.set("level", NEXT_LEVEL.id);
  nextUrl.searchParams.set("rev", "forest-prototype-1");
  window.location.assign(nextUrl);
});
ui.nextReplay.addEventListener("click", reset);
ui.pauseButton.addEventListener("click", pauseGame);
ui.resume.addEventListener("click", resumeGame);
ui.restartLevel.addEventListener("click", () => {
  resumeGame();
  reset();
  showGuidance("The level has restarted from the beginning.", "Restart", 3600);
});
ui.checkpointButton.addEventListener("click", () => {
  resumeGame();
  respawnAtCheckpoint();
});
ui.volumeSlider.addEventListener("input", (event) => {
  ensureAudio();
  setVolume(event.target.value);
});
ui.retry.addEventListener("click", () => {
  if (checkpointState) {
    respawnAtCheckpoint();
  } else {
    reset();
  }
});

setVolume(ui.volumeSlider.value);
resize();
animate();
