import * as THREE from "three";

const TOTAL_NOTES = 5;
const MAX_HEALTH = 3;
const MAX_SOUND_ENERGY = 2;
const STARTING_SOUND_ENERGY = 1;
const PLAYER = { width: 0.82, height: 2.04, speed: 5.4, jump: 10.8 };
const SHADOW = { width: 0.88, height: 0.82, speed: 1.35 };
const SOUND_WAVE = { cost: 1, range: 3.6, duration: 0.52, cooldown: 1.1, stun: 2.8 };
const NOTE_PROXIMITY = { radius: 3.2, collectRadius: 0.9 };
const DAMAGE = { invulnerability: 1.35, knockback: 1.55, bounce: 6.2 };
const EXIT_DOOR = { minX: 33, maxX: 35.4 };
const CHECKPOINT_X = 20.8;
const PLAYER_Z = 2;
const PLAYER_START_Y = -0.98;
const GRAVITY = 18;

const ui = {
  game: document.querySelector("#game"),
  intro: document.querySelector("#intro"),
  encore: document.querySelector("#encore"),
  gameOver: document.querySelector("#game-over"),
  noteCount: document.querySelector("#note-count"),
  soundEnergy: document.querySelector("#sound-energy"),
  energyPips: [...document.querySelectorAll("#sound-energy .energy-pip")],
  health: document.querySelector("#health"),
  healthHearts: [...document.querySelectorAll("#health .heart")],
  mission: document.querySelector("#mission-text"),
  encoreScore: document.querySelector("#encore-score"),
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

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050711);
scene.fog = new THREE.FogExp2(0x070914, 0.032);

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

scene.add(new THREE.HemisphereLight(0x62789e, 0x07070b, 1.2));

const moon = new THREE.DirectionalLight(0xa8c9ff, 2.2);
moon.position.set(-5, 10, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -18;
moon.shadow.camera.right = 18;
moon.shadow.camera.top = 12;
moon.shadow.camera.bottom = -8;
scene.add(moon);

const neon = new THREE.PointLight(0x39dff7, 26, 12, 2);
neon.position.set(4, 2, 3);
scene.add(neon);

const stageLight = new THREE.SpotLight(0xff3fbf, 48, 16, Math.PI / 5, 0.55, 1.5);
stageLight.position.set(34, 7, 5);
stageLight.target.position.set(34, -0.5, 0);
scene.add(stageLight, stageLight.target);

const platforms = [];
const notes = [];
const shadows = [];
const soundWaves = [];
const checkpoints = [];
const parallaxLayers = [];
const atmosphere = { lights: [], fog: [], motes: null, windows: [] };
const keys = new Set();
let started = false;
let completed = false;
let defeated = false;
let collected = 0;
let health = MAX_HEALTH;
let soundEnergy = STARTING_SOUND_ENERGY;
let invulnerabilityTime = 0;
let velocityY = 0;
let onGround = false;
let facing = 1;
let audio = null;
let masterGain = null;
let masterVolume = 1;
let landingBounce = 0;
let soundWaveCooldown = 0;
let checkpointState = null;
let guidanceTimer = null;
let checkpointNoticeTimer = null;
let exitHintShown = false;
let paused = false;
let gameTime = 0;
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
  checkpointNoticeTimer = setTimeout(hideCheckpointNotice, 3600);
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
      beacon.userData.isBeacon = true;
      farLayer.add(antenna, beacon);
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

  parallaxLayers[0]?.group.traverse((object) => {
    if (!object.userData.isBeacon) return;
    object.material.opacity = 0.3 + (Math.sin(elapsed * 2.4 + object.userData.phase) + 1) * 0.28;
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
    new THREE.MeshBasicMaterial({ color: 0x2d6475 }),
  );
  edge.position.set(x, y + height / 2 + 0.025, 0);
  scene.add(edge);
}

function createStage() {
  const stageMaterial = mat(0x292035, 0.55, 0.38);
  const pillarGeometry = new THREE.BoxGeometry(0.4, 4.2, 1.2);
  const left = new THREE.Mesh(pillarGeometry, stageMaterial);
  const right = left.clone();
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.42, 1.2), stageMaterial);
  left.position.set(32, 0.1, -0.2);
  right.position.set(36.4, 0.1, -0.2);
  roof.position.set(34.2, 2.2, -0.2);
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
  sign.position.set(34.2, 1.35, 0.45);
  scene.add(sign);
}

function createAtmosphere() {
  const lampBody = mat(0x28354a, 0.72, 0.34);
  const lamps = [
    { x: 13.2, color: 0x3de8ff, intensity: 11, phase: 0.4 },
    { x: 22.4, color: 0xff4ecb, intensity: 9, phase: 1.8 },
    { x: 29.8, color: 0x56dfff, intensity: 10, phase: 3.1 },
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

  [3, 12, 21, 30, 39].forEach((x, index) => {
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

function createCheckpoint() {
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
  group.position.set(CHECKPOINT_X, -2, PLAYER_Z - 0.32);
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
    x: CHECKPOINT_X,
    respawnX: CHECKPOINT_X + 0.75,
    activated: false,
    activation: 0,
  });
}

function createWorld() {
  createCity();
  addPlatform(15, -2.65, 44, 1.3, 0x121722);
  addPlatform(6.2, 0.75, 3.4, 0.48);
  addPlatform(11.7, 1.25, 3.1, 0.48);
  addPlatform(17.4, 0.75, 3.8, 0.48);
  addPlatform(23.2, 1.2, 3.2, 0.48);
  addPlatform(28.2, 0.75, 3, 0.48);
  addPlatform(34.2, -2.275, 7.4, 0.55, 0x21162a);
  createStage();
  createAtmosphere();
  createCheckpoint();
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
  guitar.position.set(-0.22, -0.01, -0.34);
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

  const backArm = createArm(-0.2, -0.02);
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
    color: 0xff4ecb,
    emissive: 0xff168e,
    emissiveIntensity: 2.2,
    roughness: 0.28,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), noteMaterial);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.72, 10), noteMaterial);
  const flag = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 8, 18, Math.PI * 1.05), noteMaterial);
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: 0xff55cf,
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.022, 8, 48), haloMaterial);
  const glow = new THREE.PointLight(0xff3fbf, 2.4, 2.2, 2);
  head.scale.set(1.25, 0.82, 0.6);
  head.rotation.z = -0.35;
  stem.position.set(0.22, 0.31, 0);
  flag.position.set(0.06, 0.65, 0);
  flag.rotation.z = -0.4;
  halo.position.y = 0.24;
  glow.position.set(0, 0.24, 0.35);
  group.add(head, stem, flag, halo, glow);
  group.position.set(x, y, PLAYER_Z + 0.1);
  scene.add(group);
  notes.push({
    group,
    phase,
    originY: y,
    collected: false,
    nearCuePlayed: false,
    material: noteMaterial,
    halo,
    glow,
  });
}

function createNotes() {
  [[3.3, -0.9], [6.2, 2.05], [12, 2.35], [23.2, 2.3], [29.5, 2.05]]
    .forEach(([x, y], index) => addNote(x, y, index * 1.2));
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
  createShadowCreature(16.2, 14.2, 19.2, 1);
  createShadowCreature(26.4, 24.7, 29.5, -1);
}

function createRain() {
  const dropCount = 280;
  const positions = new Float32Array(dropCount * 2 * 3);
  for (let i = 0; i < dropCount; i += 1) {
    const x = -15 + Math.random() * 70;
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
const rain = createRain();
const clock = new THREE.Clock();

function ensureAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!audio && AudioContextClass) {
    audio = new AudioContextClass();
    masterGain = audio.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(audio.destination);
  }
  if (audio && audio.state === "suspended") audio.resume();
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
  shadows.forEach((shadow) => {
    const dx = shadow.group.position.x - player.position.x;
    const dy = shadow.group.position.y - player.position.y;
    if (Math.hypot(dx, dy) > SOUND_WAVE.range) return;
    shadow.stunTime = SOUND_WAVE.stun;
    shadow.hitFlash = 0.35;
    hits += 1;
  });

  tone(147, 0.34, 0, "sawtooth");
  tone(294, 0.3, 0.035, "triangle");
  if (hits > 0) {
    tone(523, 0.18, 0.08, "square");
    ui.mission.textContent = hits === 1
      ? "The sound wave stunned a shadow. Move while the path is open."
      : `The sound wave stunned ${hits} shadows. Move while the path is open.`;
  } else {
    ui.mission.textContent = "The sound wave fades into the empty street.";
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
  [196, 247, 294, 392, 494, 587, 784].forEach((frequency, index) => {
    tone(frequency, 0.32, index * 0.16, index % 3 === 0 ? "sawtooth" : "triangle");
  });
}

function updateHealth() {
  ui.healthHearts.forEach((heart, index) => heart.classList.toggle("is-lost", index >= health));
  ui.health.setAttribute("aria-label", `${health} ${health === 1 ? "heart" : "hearts"} remaining`);
}

function placePlayer(x, cameraX = THREE.MathUtils.clamp(x + 2, 0, 31.5)) {
  velocityY = 0;
  onGround = false;
  landingBounce = 0;
  player.position.set(x, PLAYER_START_Y, PLAYER_Z);
  player.rotation.set(0, 0, 0);
  camera.position.x = cameraX;
  camera.lookAt(cameraX, 0.7, 0);
  player.userData.rig.walkTime = 0;
  player.userData.rig.visual.position.set(0, 0, 0);
  player.userData.rig.visual.scale.set(1, 1, 1);
  player.userData.rig.visual.visible = true;
  const guitar = player.getObjectByName("guitar");
  guitar.position.set(-0.22, -0.01, -0.34);
  guitar.rotation.set(0, 0, 0.38);
}

function restoreNotes(noteStates = null) {
  notes.forEach((note, index) => {
    note.collected = noteStates ? noteStates[index] : false;
    note.group.visible = !note.collected;
    note.group.position.y = note.originY;
    note.group.scale.setScalar(1);
    note.nearCuePlayed = false;
    note.material.emissiveIntensity = 2.2;
    note.halo.material.opacity = 0.12;
    note.halo.scale.setScalar(1);
    note.glow.intensity = 2.4;
    note.glow.distance = 2.2;
  });
}

function resetThreats() {
  shadows.forEach((shadow) => {
    shadow.group.position.x = shadow.startX;
    shadow.direction = shadow.initialDirection;
    shadow.stunTime = 0;
    shadow.hitFlash = 0;
  });
  soundWaves.splice(0).forEach(removeSoundWave);
}

function activateCheckpoint(checkpoint) {
  checkpoint.activated = true;
  checkpointState = {
    checkpoint,
    collected,
    soundEnergy,
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
  invulnerabilityTime = 1;
  soundWaveCooldown = 0;
  paused = false;
  hideCheckpointNotice();
  placePlayer(checkpointState.checkpoint.respawnX);
  restoreNotes(checkpointState.notes);
  resetThreats();
  stageLight.intensity = 48;
  neon.intensity = 26;
  scene.background.set(0x050711);
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
    37.2,
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
  completed = false;
  defeated = false;
  collected = 0;
  health = MAX_HEALTH;
  soundEnergy = STARTING_SOUND_ENERGY;
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
  stageLight.intensity = 48;
  neon.intensity = 26;
  scene.background.set(0x050711);
  ui.noteCount.textContent = `0 / ${TOTAL_NOTES}`;
  updateHealth();
  updateSoundEnergy();
  ui.mission.textContent = "Collect lost notes and enter the LIVE door. Jump shadows or break through with sound.";
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

function finish() {
  if (completed) return;
  completed = true;
  velocityY = 0;
  keys.clear();
  releaseTouchMovement();
  stageLight.intensity = 120;
  neon.intensity = 58;
  scene.background.set(0x12091c);
  ui.mission.textContent = "The silence breaks. The district can hear you.";
  hideGuidance();
  hideCheckpointNotice();
  ui.pauseButton.hidden = true;
  ui.game.classList.remove("is-active", "is-paused");
  ui.encoreScore.textContent = `You carried ${collected} of ${TOTAL_NOTES} lost notes to the stage.`;
  solo();
  setTimeout(() => (ui.encore.hidden = false), 1250);
}

function updatePlayer(delta) {
  if (!started || completed || defeated) return;
  invulnerabilityTime = Math.max(0, invulnerabilityTime - delta);
  player.userData.rig.visual.visible = invulnerabilityTime === 0
    || Math.floor(invulnerabilityTime * 14) % 2 === 0;
  const direction = Number(keys.has("ArrowRight") || keys.has("KeyD"))
    - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  if (direction) facing = direction;
  player.position.x = THREE.MathUtils.clamp(player.position.x + direction * PLAYER.speed * delta, -1.5, 37.2);
  if (!exitHintShown && player.position.x > 30.5) {
    exitHintShown = true;
    showGuidance("Step through the glowing LIVE door on the ground to finish the level.", "Final step", 6000);
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
  if (insideExitDoor && onGround) finish();
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
      note.group.visible = false;
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

function animateEncore(elapsed) {
  if (!completed) return;
  const guitar = player.getObjectByName("guitar");
  guitar.position.lerp(new THREE.Vector3(0.26, 0.02, 0.55), 0.055);
  guitar.rotation.z = THREE.MathUtils.lerp(guitar.rotation.z, 0.28, 0.055);
  guitar.rotation.y = Math.sin(elapsed * 5) * 0.08;
  player.rotation.z = Math.sin(elapsed * 3.8) * 0.035;
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
  updateSoundWaves(delta);
  updateRain(delta);
  const targetX = THREE.MathUtils.clamp(player.position.x + 2, 0, 31.5);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.055);
  camera.lookAt(camera.position.x, 0.7, 0);
  updateParallax(elapsed);
  updateAtmosphere(delta, elapsed);
  animateEncore(elapsed);
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
