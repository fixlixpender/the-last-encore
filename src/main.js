import * as THREE from "three";

const TOTAL_NOTES = 5;
const PLAYER = { width: 0.82, height: 2.04, speed: 5.4, jump: 10.8 };
const PLAYER_Z = 2;
const PLAYER_START_Y = -0.98;
const GRAVITY = 18;

const ui = {
  game: document.querySelector("#game"),
  intro: document.querySelector("#intro"),
  encore: document.querySelector("#encore"),
  noteCount: document.querySelector("#note-count"),
  mission: document.querySelector("#mission-text"),
  encoreScore: document.querySelector("#encore-score"),
  start: document.querySelector("#start-button"),
  restart: document.querySelector("#restart-button"),
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
const keys = new Set();
let started = false;
let completed = false;
let collected = 0;
let velocityY = 0;
let onGround = false;
let facing = 1;
let audio = null;
let landingBounce = 0;

function mat(color, roughness = 0.76, metalness = 0.18) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createCity() {
  const buildings = mat(0x0b1020, 0.92, 0.05);
  const windows = new THREE.MeshBasicMaterial({ color: 0x203a51 });
  for (let i = 0; i < 22; i += 1) {
    const width = 2.4 + (i % 4) * 0.65;
    const height = 4.5 + ((i * 7) % 9) * 0.72;
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, 2.4), buildings);
    building.position.set(-9 + i * 2.7, height / 2 - 2.5, -6 - (i % 3) * 1.4);
    scene.add(building);
    for (let row = 0; row < Math.floor(height / 1.25); row += 1) {
      if ((row + i) % 3 === 0) continue;
      const windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.32), windows);
      windowMesh.position.set(building.position.x - width * 0.2, -1.4 + row * 1.12, building.position.z + 1.21);
      scene.add(windowMesh);
    }
  }
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
  head.scale.set(1.25, 0.82, 0.6);
  head.rotation.z = -0.35;
  stem.position.set(0.22, 0.31, 0);
  flag.position.set(0.06, 0.65, 0);
  flag.rotation.z = -0.4;
  group.add(head, stem, flag);
  group.position.set(x, y, PLAYER_Z + 0.1);
  scene.add(group);
  notes.push({ group, phase, originY: y, collected: false });
}

function createNotes() {
  [[3.3, -0.9], [6.2, 2.05], [12, 2.35], [23.2, 2.3], [29.5, 2.05]]
    .forEach(([x, y], index) => addNote(x, y, index * 1.2));
}

function createRain() {
  const positions = new Float32Array(720 * 3);
  for (let i = 0; i < 720; i += 1) {
    positions[i * 3] = -15 + Math.random() * 70;
    positions[i * 3 + 1] = -2 + Math.random() * 16;
    positions[i * 3 + 2] = -4 + Math.random() * 8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0x8ac9dd, size: 0.035, transparent: true, opacity: 0.55 }),
  );
  scene.add(rain);
  return rain;
}

createWorld();
const player = createPlayer();
createNotes();
const rain = createRain();
const clock = new THREE.Clock();

function ensureAudio() {
  if (!audio) audio = new AudioContext();
  if (audio.state === "suspended") audio.resume();
}

function tone(frequency, duration = 0.18, delay = 0, type = "triangle") {
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function solo() {
  [196, 247, 294, 392, 494, 587, 784].forEach((frequency, index) => {
    tone(frequency, 0.32, index * 0.16, index % 3 === 0 ? "sawtooth" : "triangle");
  });
}

function reset() {
  completed = false;
  collected = 0;
  velocityY = 0;
  onGround = false;
  landingBounce = 0;
  player.position.set(0, PLAYER_START_Y, PLAYER_Z);
  player.rotation.set(0, 0, 0);
  player.userData.rig.walkTime = 0;
  player.userData.rig.visual.position.set(0, 0, 0);
  player.userData.rig.visual.scale.set(1, 1, 1);
  const guitar = player.getObjectByName("guitar");
  guitar.position.set(-0.22, -0.01, -0.34);
  guitar.rotation.set(0, 0, 0.38);
  notes.forEach((note) => {
    note.collected = false;
    note.group.visible = true;
    note.group.position.y = note.originY;
  });
  stageLight.intensity = 48;
  neon.intensity = 26;
  scene.background.set(0x050711);
  ui.noteCount.textContent = `0 / ${TOTAL_NOTES}`;
  ui.mission.textContent = "Cross the silent district. Reach the rooftop show.";
  ui.encore.hidden = true;
  clock.start();
}

function finish() {
  if (completed) return;
  completed = true;
  velocityY = 0;
  keys.clear();
  stageLight.intensity = 120;
  neon.intensity = 58;
  scene.background.set(0x12091c);
  ui.mission.textContent = "The silence breaks. The district can hear you.";
  ui.encoreScore.textContent = `You carried ${collected} of ${TOTAL_NOTES} lost notes to the stage.`;
  solo();
  setTimeout(() => (ui.encore.hidden = false), 1250);
}

function updatePlayer(delta) {
  if (!started || completed) return;
  const direction = Number(keys.has("ArrowRight") || keys.has("KeyD"))
    - Number(keys.has("ArrowLeft") || keys.has("KeyA"));
  if (direction) facing = direction;
  player.position.x = THREE.MathUtils.clamp(player.position.x + direction * PLAYER.speed * delta, -1.5, 37.2);
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
  if (player.position.x > 33.1 && player.position.y > -1.8) finish();
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
    note.group.rotation.y = elapsed * 1.7 + note.phase;
    note.group.position.y = note.originY + Math.sin(elapsed * 2.1 + note.phase) * 0.1;
    if (started && !completed && note.group.position.distanceTo(player.position) < 0.9) {
      note.collected = true;
      note.group.visible = false;
      collected += 1;
      ui.noteCount.textContent = `${collected} / ${TOTAL_NOTES}`;
      tone(330 * 1.12 ** index, 0.24, 0, "sine");
      if (collected === TOTAL_NOTES) ui.mission.textContent = "Every lost note is with you. Take them to the stage.";
    }
  });
}

function updateRain(delta) {
  const positions = rain.geometry.getAttribute("position");
  for (let i = 0; i < positions.count; i += 1) {
    let x = positions.getX(i) - delta * 0.8;
    let y = positions.getY(i) - delta * (7 + (i % 5));
    if (y < -3) {
      x = camera.position.x - 12 + Math.random() * 30;
      y = 11 + Math.random() * 4;
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
  if (!started || completed || !onGround) return;
  velocityY = PLAYER.jump;
  onGround = false;
  tone(165, 0.1, 0, "square");
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;
  updatePlayer(delta);
  updateNotes(elapsed);
  updateRain(delta);
  const targetX = THREE.MathUtils.clamp(player.position.x + 2, 0, 31.5);
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.055);
  camera.lookAt(camera.position.x, 0.7, 0);
  animateEncore(elapsed);
  renderer.render(scene, camera);
}

addEventListener("keydown", (event) => {
  ensureAudio();
  keys.add(event.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) event.preventDefault();
  if (["Space", "KeyW", "ArrowUp"].includes(event.code) && !event.repeat) jump();
});
addEventListener("keyup", (event) => keys.delete(event.code));
addEventListener("blur", () => keys.clear());
addEventListener("resize", resize);

ui.start.addEventListener("click", () => {
  ensureAudio();
  started = true;
  ui.intro.hidden = true;
  reset();
  tone(110, 0.45, 0, "sine");
});
ui.restart.addEventListener("click", reset);

resize();
animate();
