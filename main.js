import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ============================================================
   GLITCH GAMES — explorable Three.js studio world.

   All props (trees, rocks, skateboard, character, portal rings,
   portfolio pedestals, the about tent, socials totem, contact
   desk, hub signpost) are loaded from /assets/*.glb — see
   README.md for the full list and how to swap your own in.

   Terrain (ground, islands, bridges, the climbable cliff) stays
   procedural, since it doubles as the collision/raycast surface
   the character controller walks on.
   ============================================================ */

// ---------- Renderer / Scene / Camera ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG_COLOR = 0x1c1033;
scene.fog = new THREE.FogExp2(FOG_COLOR, 0.016);
scene.background = new THREE.Color(FOG_COLOR);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth/window.innerHeight, 0.1, 300);

// ---------- Lights ----------
const hemi = new THREE.HemisphereLight(0xa855f7, 0x241542, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xff8fd6, 1.35);
sun.position.set(-18, 22, -10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 80;
sun.shadow.bias = -0.0025;
scene.add(sun);
const rim = new THREE.DirectionalLight(0x00f0ff, 0.4);
rim.position.set(15,10,15);
scene.add(rim);

// gradient sky dome
(function(){
  const skyGeo = new THREE.SphereGeometry(150, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms:{
      top:{value:new THREE.Color(0x0a0714)},
      mid:{value:new THREE.Color(0x3a1f6e)},
      bot:{value:new THREE.Color(0xff2fb0)}
    },
    vertexShader:`varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader:`
      varying vec3 vPos; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      void main(){
        float h = normalize(vPos).y;
        vec3 c = h > 0.0 ? mix(mid, top, smoothstep(0.0,0.9,h)) : mix(mid, bot, smoothstep(0.0,-0.5,h));
        gl_FragColor = vec4(c,1.0);
      }`
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
})();

// ---------- Terrain-only materials (props bring their own materials from .glb) ----------
const MAT = {
  ground: new THREE.MeshStandardMaterial({color:0x2b1f45, flatShading:true, roughness:1}),
  groundAlt: new THREE.MeshStandardMaterial({color:0x34254f, flatShading:true, roughness:1}),
  path: new THREE.MeshStandardMaterial({color:0x4a3560, flatShading:true, roughness:1}),
  rock: new THREE.MeshStandardMaterial({color:0x4a4166, flatShading:true, roughness:1}),
  cyan: new THREE.MeshStandardMaterial({color:0x00f0ff, flatShading:true, emissive:0x00f0ff, emissiveIntensity:0.45, roughness:.6}),
};

// ---------- World collections ----------
const groundMeshes = [];   // raycast targets for standing height
const blockers = [];       // {pos:THREE.Vector3, r:number} horizontal push-out colliders
let climbWall = null;      // {box:THREE.Box3, mesh}

function addGround(mesh){ mesh.receiveShadow = true; groundMeshes.push(mesh); scene.add(mesh); return mesh; }
function addBlocker(pos, r){ blockers.push({pos:pos.clone(), r}); }

// Base terrain: broad ground plus raised circular "islands" for zones, joined by ramps/paths.
function makeIsland(x, z, radius, height, color){
  const g = new THREE.Group();
  const topGeo = new THREE.CylinderGeometry(radius, radius*1.06, height, 20, 1);
  const top = new THREE.Mesh(topGeo, color ? new THREE.MeshStandardMaterial({color, flatShading:true, roughness:1}) : MAT.groundAlt);
  top.position.y = height/2;
  top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  g.position.set(x, 0, z);
  scene.add(g);
  const rayTop = top.clone();
  rayTop.position.set(x, height/2, z);
  addGround(rayTop);
  // Islands are walkable surfaces, not obstacles — no horizontal blocker here.
  return {x,z,radius,height};
}

// Large base ground
const baseGround = new THREE.Mesh(new THREE.CircleGeometry(90, 48), MAT.ground);
baseGround.rotation.x = -Math.PI/2;
addGround(baseGround);

function ringPath(radius){
  const geo = new THREE.TorusGeometry(radius, 1.1, 6, 64);
  const m = new THREE.Mesh(geo, MAT.path);
  m.rotation.x = -Math.PI/2;
  m.position.y = 0.02;
  m.receiveShadow = true;
  scene.add(m);
}
ringPath(16);

function bridgeBetween(a,b){
  const dx = b.x-a.x, dz = b.z-a.z;
  const dist = Math.hypot(dx,dz);
  const dirX = dx/dist, dirZ = dz/dist;
  const startX = a.x + dirX*(a.r-0.5), startZ = a.z + dirZ*(a.r-0.5);
  const endX = b.x - dirX*(b.r-0.5), endZ = b.z - dirZ*(b.r-0.5);
  const midX = (startX+endX)/2, midZ = (startZ+endZ)/2;
  const len = Math.hypot(endX-startX, endZ-startZ);
  const rotY = Math.atan2(endX-startX, endZ-startZ);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.45, len+1), MAT.path);
  const avgH = ((a.h||0)+(b.h||0))/2;
  bridge.position.set(midX, avgH, midZ);
  bridge.rotation.y = rotY;
  bridge.castShadow = true; bridge.receiveShadow = true;
  addGround(bridge);
}

// ---------- Zones ----------
const ZONES = [];
function defineZone(id, name, eyebrow, x, z, radius, promptText, onOpen){
  ZONES.push({id,name,eyebrow,x,z,radius,promptText,onOpen});
}

function textSprite(msg, colorHex){
  const canvasEl = document.createElement('canvas');
  const ctx = canvasEl.getContext('2d');
  const scale = 2;
  canvasEl.width = 512; canvasEl.height = 128;
  ctx.scale(scale,scale);
  ctx.font = "700 34px 'Chakra Petch', sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(13,15,28,0.0)';
  ctx.fillRect(0,0,256,64);
  ctx.fillStyle = colorHex;
  ctx.fillText(msg, 128, 34);
  const tex = new THREE.CanvasTexture(canvasEl);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false});
  const spr = new THREE.Sprite(mat);
  spr.scale.set(4.6, 1.15, 1);
  return spr;
}

// =========================================================================
// ASSET LOADING — every prop/character comes from /assets/*.glb.
// Swap any file in /assets to replace that prop; the loader + placement
// code below doesn't care what's inside as long as the filename matches.
// =========================================================================
const ASSET_LIST = [
  'tree', 'rock', 'skateboard', 'character',
  'portal-ring-purple', 'portal-ring-cyan',
  'portfolio-pedestal', 'about-tent', 'socials-totem', 'contact-desk', 'hub-signpost'
];

const gltfLoader = new GLTFLoader();
const models = {}; // name -> THREE.Group (the loaded template; clone before adding to scene)

function makePlaceholder(name){
  // Fallback so a missing/broken custom .glb doesn't take down the whole site.
  const g = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0xff2fb0, wireframe:true})
  );
  mesh.position.y = 0.5;
  g.add(mesh);
  g.userData.isPlaceholder = true;
  console.warn(`[assets] Failed to load "${name}.glb" — using placeholder. Check /assets/${name}.glb exists and is a valid binary glTF.`);
  return g;
}

async function loadAllAssets(onProgress){
  let loaded = 0;
  const total = ASSET_LIST.length;
  await Promise.all(ASSET_LIST.map(async (name) => {
    try {
      const gltf = await gltfLoader.loadAsync(`assets/${name}.glb`);
      const root = gltf.scene;
      root.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
      models[name] = root;
    } catch(err){
      models[name] = makePlaceholder(name);
    } finally {
      loaded++;
      if(onProgress) onProgress(loaded/total);
    }
  }));
}

// Clone a loaded template for placement in the world (shares geometry/material buffers).
function spawnModel(name, x, y, z, rotY){
  const clone = models[name].clone(true);
  clone.position.set(x, y, z);
  if(rotY) clone.rotation.y = rotY;
  scene.add(clone);
  return clone;
}

// Instance a multi-mesh model many times via InstancedMesh (cheap draw calls,
// used for trees/rocks). Handles any node structure — one mesh or several.
function instanceModel(name, placements){
  const template = models[name];
  const parts = [];
  template.updateMatrixWorld(true);
  template.traverse(o => {
    if(o.isMesh){
      parts.push({ geometry:o.geometry, material:o.material, localMatrix:o.matrixWorld.clone() });
    }
  });
  const instancedMeshes = parts.map(part => {
    const im = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
    return im;
  });
  const finalMatrix = new THREE.Matrix4();
  placements.forEach((m, i) => {
    parts.forEach((part, pi) => {
      finalMatrix.multiplyMatrices(m, part.localMatrix);
      instancedMeshes[pi].setMatrixAt(i, finalMatrix);
    });
  });
  instancedMeshes.forEach(im => im.instanceMatrix.needsUpdate = true);
}

function scatterProp(name, count, avoid, opts){
  const placements = [];
  const dummy = new THREE.Object3D();
  let placed = 0, tries = 0;
  const { rMin, rMax, avoidPad, baseY, scaleMin, scaleMax } = opts;
  while(placed < count && tries < count*20){
    tries++;
    const a = Math.random()*Math.PI*2, r = rMin + Math.random()*(rMax-rMin);
    const x = Math.cos(a)*r, z = Math.sin(a)*r;
    let ok = true;
    for(const av of avoid){ if(Math.hypot(x-av.x, z-av.z) < av.r+avoidPad){ ok=false; break; } }
    if(!ok) continue;
    const s = scaleMin + Math.random()*(scaleMax-scaleMin);
    dummy.position.set(x, baseY, z);
    dummy.rotation.set(0, Math.random()*Math.PI*2, 0);
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    placements.push(dummy.matrix.clone());
    if(opts.blockerRadius){
      const br = typeof opts.blockerRadius === 'function' ? opts.blockerRadius(s) : opts.blockerRadius;
      if(br > 0) addBlocker(new THREE.Vector3(x,0,z), br);
    }
    placed++;
  }
  instanceModel(name, placements);
}

function portal(name, x, z, y){
  return spawnModel(name, x, y+1.6, z);
}

// =========================================================================
// BOOT SEQUENCE
// =========================================================================
const barFill = document.getElementById('barFill');
const loadingEl = document.getElementById('loading');
const startBtn = document.getElementById('startBtn');

loadAllAssets((frac) => {
  barFill.style.width = `${Math.round(frac*100)}%`;
  if(frac >= 1) startBtn.classList.add('show');
}).then(buildWorld);

// ---------- Layout coordinates ----------
const HUB = {x:0, z:0, r:9, h:0.6};
const PORTFOLIO = {x:26, z:-6, r:10, h:1.4};
const ABOUT = {x:-24, z:-14, r:9, h:1.1};
const SOCIALS = {x:-4, z:30, r:8, h:1.0};
const CONTACT = {x:22, z:22, r:7.5, h:0.8};
const CLIFF = {x:-30, z:16, r:8};

const GAMES = [
  {title:'EMBERFALL', genre:'Action-Adventure', blurb:'A wordless descent through a burning citadel — every fight is a puzzle in disguise.'},
  {title:'TIDEBOUND', genre:'Co-op Puzzle', blurb:'Two divers, one tether. Solve ocean-floor ruins together or drown trying.'},
  {title:'GLASS COURIER', genre:'Precision Platformer', blurb:'Deliver fragile cargo across a shattering skyline. One hit ends the run.'},
];

let player, bodyParts, skateboard;

function buildWorld(){
  makeIsland(HUB.x, HUB.z, HUB.r, HUB.h, 0x2b1f45);
  makeIsland(PORTFOLIO.x, PORTFOLIO.z, PORTFOLIO.r, PORTFOLIO.h, 0x34254f);
  makeIsland(ABOUT.x, ABOUT.z, ABOUT.r, ABOUT.h, 0x34254f);
  makeIsland(SOCIALS.x, SOCIALS.z, SOCIALS.r, SOCIALS.h, 0x34254f);
  makeIsland(CONTACT.x, CONTACT.z, CONTACT.r, CONTACT.h, 0x34254f);

  bridgeBetween(HUB, PORTFOLIO);
  bridgeBetween(HUB, ABOUT);
  bridgeBetween(HUB, SOCIALS);
  bridgeBetween(HUB, CONTACT);
  bridgeBetween(HUB, {x:CLIFF.x, z:CLIFF.z, r:6, h:0});

  const avoidList = [HUB,PORTFOLIO,ABOUT,SOCIALS,CONTACT,{x:CLIFF.x,z:CLIFF.z,r:CLIFF.r}];
  scatterProp('tree', 70, avoidList, { rMin:20, rMax:82, avoidPad:2.5, baseY:0, scaleMin:0.8, scaleMax:1.5, blockerRadius:0.5 });
  scatterProp('rock', 50, avoidList, { rMin:8, rMax:78, avoidPad:1.5, baseY:0, scaleMin:0.5, scaleMax:1.3, blockerRadius:(s)=> s>0.9 ? s*0.6 : 0 });

  // ---- Hub: signpost + skateboard ----
  spawnModel('hub-signpost', 0, HUB.h, -2);
  const s = textSprite('GLITCH GAMES', '#0d0f1c');
  s.position.set(0, HUB.h+2.7, -1.9);
  s.scale.set(3.2,0.8,1);
  scene.add(s);

  skateboard = spawnModel('skateboard', 2.4, HUB.h+0.35, 2.2);
  portal('portal-ring-purple', 2.4, 2.2, HUB.h);

  // ---- Climb wall (cliff) — kept procedural; see README for why ----
  const climbGeo = new THREE.BoxGeometry(3, 9, 10);
  const climbMesh = new THREE.Mesh(climbGeo, MAT.rock);
  climbMesh.position.set(CLIFF.x, 4.5, CLIFF.z);
  climbMesh.castShadow = true; climbMesh.receiveShadow = true;
  scene.add(climbMesh);
  climbWall = { mesh: climbMesh, topY: 9, faceX: CLIFF.x - 1.5 };

  const cliffBase = new THREE.Mesh(new THREE.CylinderGeometry(6,6.4,0.6,16), MAT.groundAlt);
  cliffBase.position.set(CLIFF.x, 0.3, CLIFF.z);
  addGround(cliffBase);
  addBlocker(new THREE.Vector3(CLIFF.x, 0, CLIFF.z), 1.6);
  const cliffTop = new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.4,0.5,16), MAT.groundAlt);
  cliffTop.position.set(CLIFF.x, 9.25, CLIFF.z);
  addGround(cliffTop);
  const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08,8.6,9.6), MAT.cyan);
  glowStrip.position.set(CLIFF.x-1.55, 4.5, CLIFF.z);
  scene.add(glowStrip);
  const viewSign = textSprite('SECRET VIEWPOINT ▲', '#4adecd');
  viewSign.position.set(CLIFF.x, 10.6, CLIFF.z);
  scene.add(viewSign);

  // ---- Portfolio zone: game pedestals ----
  const positions = [[-4,0],[4,-1],[0,5]];
  GAMES.forEach((g,i)=>{
    const [ox,oz] = positions[i];
    const px = PORTFOLIO.x+ox, pz = PORTFOLIO.z+oz;
    spawnModel('portfolio-pedestal', px, PORTFOLIO.h, pz);
    const label = textSprite(g.title, '#0d0f1c');
    label.position.set(px, PORTFOLIO.h+2.2, pz+0.08);
    label.scale.set(2.4,0.6,1);
    scene.add(label);
  });
  portal('portal-ring-purple', PORTFOLIO.x, PORTFOLIO.z-6.5, PORTFOLIO.h);

  // ---- About zone ----
  spawnModel('about-tent', ABOUT.x, ABOUT.h, ABOUT.z);
  portal('portal-ring-purple', ABOUT.x, ABOUT.z-6, ABOUT.h);

  // ---- Socials zone ----
  spawnModel('socials-totem', SOCIALS.x, SOCIALS.h, SOCIALS.z);
  portal('portal-ring-purple', SOCIALS.x, SOCIALS.z-5.5, SOCIALS.h);

  // ---- Contact zone ----
  spawnModel('contact-desk', CONTACT.x, CONTACT.h, CONTACT.z);
  portal('portal-ring-purple', CONTACT.x, CONTACT.z-5, CONTACT.h);

  defineZone('portfolio','Our Games','Portfolio', PORTFOLIO.x, PORTFOLIO.z, 9, 'View portfolio', openPortfolioPanel);
  defineZone('about','About Glitch Games','Studio', ABOUT.x, ABOUT.z, 8, 'Meet the studio', openAboutPanel);
  defineZone('socials','Follow Along','Socials', SOCIALS.x, SOCIALS.z, 7, 'See socials', openSocialsPanel);
  defineZone('contact','Say Hello','Contact', CONTACT.x, CONTACT.z, 6.5, 'Get in touch', openContactPanel);

  // ---- Character ----
  player = spawnModel('character', HUB.x, HUB.h, HUB.z+4);
  bodyParts = {
    torso: player.getObjectByName('torso'),
    head: player.getObjectByName('head'),
    armL: player.getObjectByName('armL'),
    armR: player.getObjectByName('armR'),
    legL: player.getObjectByName('legL'),
    legR: player.getObjectByName('legR'),
  };

  startBtn.addEventListener('click', ()=>{
    loadingEl.classList.add('hidden');
    clock.getDelta(); // reset delta after idle load screen
    requestAnimationFrame(update);
  });
}

// ---------- Character state ----------
const state = {
  vel: new THREE.Vector3(),
  grounded: true,
  ducking: false,
  sprinting: false,
  climbing: false,
  onBoard: false,
  yaw: Math.PI,
  camYaw: Math.PI,
  camPitch: 0.28,
  speedAnim: 0,
};

const PLAYER_RADIUS = 0.32;
const GRAVITY = -26;
const JUMP_SPEED = 8.6;
const WALK_SPEED = 4.4;
const SPRINT_SPEED = 7.6;
const DUCK_SPEED = 2.0;
const BOARD_SPEED = 10.5;
const CLIMB_SPEED = 3.2;

const downRay = new THREE.Raycaster();
downRay.far = 40;

function groundHeightAt(x,z){
  downRay.set(new THREE.Vector3(x, 20, z), new THREE.Vector3(0,-1,0));
  const hits = downRay.intersectObjects(groundMeshes, false);
  if(hits.length) return hits[0].point.y;
  return -20;
}

// ---------- Input ----------
const keys = {};
window.addEventListener('keydown', e=>{
  keys[e.code] = true;
  if(e.code === 'Space') e.preventDefault();
  if(e.code === 'KeyE') tryInteract();
  if(e.code === 'Escape') closePanel();
});
window.addEventListener('keyup', e=>{ keys[e.code] = false; });

let dragging = false, lastX=0, lastY=0;
canvas.addEventListener('pointerdown', e=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener('pointerup', ()=>{ dragging=false; });
window.addEventListener('pointermove', e=>{
  if(!dragging) return;
  const dx = e.clientX-lastX, dy = e.clientY-lastY;
  lastX=e.clientX; lastY=e.clientY;
  state.camYaw -= dx*0.006;
  state.camPitch = THREE.MathUtils.clamp(state.camPitch + dy*0.004, 0.06, 0.9);
});
window.addEventListener('resize', ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Interaction / zones ----------
let nearZone = null;
let nearSkate = false;
const promptEl = document.getElementById('interactPrompt');
const promptText = document.getElementById('promptText');
const zoneBanner = document.getElementById('zoneBanner');
const zoneTitle = document.getElementById('zoneTitle');
const zoneEyebrow = document.getElementById('zoneEyebrow');
const modeLabel = document.getElementById('modeLabel');
let bannerZoneId = null;

function updateProximity(){
  const p = player.position;
  const dSkate = p.distanceTo(new THREE.Vector3(skateboard.position.x, p.y, skateboard.position.z));
  nearSkate = !state.onBoard && dSkate < 1.8;

  let closest = null, closestD = Infinity;
  for(const z of ZONES){
    const d = Math.hypot(p.x-z.x, p.z-z.z);
    if(d < z.radius && d < closestD){ closest = z; closestD = d; }
  }
  nearZone = closest;

  if(closest && closest.id !== bannerZoneId){
    bannerZoneId = closest.id;
    zoneEyebrow.textContent = closest.eyebrow.toUpperCase();
    zoneTitle.textContent = closest.name;
    zoneBanner.classList.add('show');
  } else if(!closest && bannerZoneId){
    bannerZoneId = null;
    zoneBanner.classList.remove('show');
  }

  if(panelOpen){ promptEl.classList.remove('show'); }
  else if(state.onBoard){
    promptText.textContent = 'Hop off skateboard';
    promptEl.classList.add('show');
  } else if(nearSkate){
    promptText.textContent = 'Grab the skateboard';
    promptEl.classList.add('show');
  } else if(nearZone){
    promptText.textContent = nearZone.promptText;
    promptEl.classList.add('show');
  } else {
    promptEl.classList.remove('show');
  }
}

function tryInteract(){
  if(panelOpen) return;
  if(state.onBoard){ state.onBoard = false; skateboard.visible = true; modeLabel.textContent='ON FOOT'; return; }
  if(nearSkate){
    state.onBoard = true;
    skateboard.visible = false;
    modeLabel.textContent = 'SKATEBOARD';
    return;
  }
  if(nearZone){ nearZone.onOpen(); }
}

// ---------- Panels ----------
const overlayEl = document.getElementById('overlay');
const panelBody = document.getElementById('panelBody');
document.getElementById('closePanel').addEventListener('click', closePanel);
overlayEl.addEventListener('click', e=>{ if(e.target===overlayEl) closePanel(); });
let panelOpen = false;

function openPanel(html){
  panelBody.innerHTML = html;
  overlayEl.classList.add('open');
  panelOpen = true;
}
function closePanel(){
  overlayEl.classList.remove('open');
  panelOpen = false;
}

function openPortfolioPanel(){
  const cards = GAMES.map(g=>`
    <div class="card">
      <span class="tag">${g.genre}</span>
      <h4>${g.title}</h4>
      <p>${g.blurb}</p>
    </div>`).join('');
  openPanel(`
    <div class="eyebrow">Portfolio</div>
    <h2>Our Games</h2>
    <p>Three shipped worlds, one small studio. Walk up to any pedestal in the plaza to see it up close — this panel is the quick-reference version.</p>
    ${cards}
  `);
}
function openAboutPanel(){
  const team = [
    {i:'RM', name:'Rae Marlowe', role:'Creative Director'},
    {i:'JT', name:'Jonas Teo', role:'Lead Engineer'},
    {i:'AK', name:'Amara Kim', role:'Art Director'},
  ];
  const rows = team.map((t,idx)=>`
    <div class="team">
      <div class="avatar" style="background:${idx%2? '#4adecd':'#ff6b4a'}">${t.i}</div>
      <div class="who"><b>${t.name}</b><span>${t.role}</span></div>
    </div>`).join('');
  openPanel(`
    <div class="eyebrow">Studio</div>
    <h2>About Glitch Games</h2>
    <p>We're a small independent studio that builds tactile, physical-feeling worlds — places that reward curiosity over checklists. This site is one of them, glitches and all.</p>
    ${rows}
    <p>Founded in 2019. Based remotely, shipping worldwide.</p>
  `);
}
function openSocialsPanel(){
  const items = [
    {n:'X / Twitter', h:'@glitchgames'},
    {n:'Instagram', h:'@glitch.games.studio'},
    {n:'YouTube', h:'Glitch Games Devlogs'},
    {n:'Discord', h:'Join the community'},
  ];
  const rows = items.map(s=>`
    <a class="social-row" href="#">
      <div class="dot"></div>
      <div><b>${s.n}</b><span>${s.h}</span></div>
    </a>`).join('');
  openPanel(`
    <div class="eyebrow">Socials</div>
    <h2>Follow Along</h2>
    <p>Devlogs, prototypes, and the occasional 2am screenshot.</p>
    ${rows}
  `);
}
function openContactPanel(){
  openPanel(`
    <div class="eyebrow">Contact</div>
    <h2>Say Hello</h2>
    <p>Publishing pitches, collabs, or just want to talk shop — the mailbox is always open.</p>
    <a class="mail" href="mailto:hello@glitchgames.studio">hello@glitchgames.studio</a>
    <p style="margin-top:22px;">Prefer async? We reply to everything within a week.</p>
  `);
}

// ---------- Camera-relative movement helpers ----------
const moveDir = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function resolveBlockers(pos){
  for(const b of blockers){
    const dx = pos.x-b.pos.x, dz = pos.z-b.pos.z;
    const dist = Math.hypot(dx,dz);
    const minDist = b.r + PLAYER_RADIUS;
    if(dist>0 && dist < minDist){
      const push = (minDist-dist);
      pos.x += (dx/dist)*push;
      pos.z += (dz/dist)*push;
    }
  }
}

// ---------- Main update ----------
const clock = new THREE.Clock();

function update(){
  const dt = Math.min(clock.getDelta(), 0.05);
  const p = player.position;

  const forwardInput = (keys['KeyW']||keys['ArrowUp']) ? 1 : (keys['KeyS']||keys['ArrowDown']) ? -1 : 0;
  const strafeInput = (keys['KeyD']||keys['ArrowRight']) ? 1 : (keys['KeyA']||keys['ArrowLeft']) ? -1 : 0;
  state.sprinting = !!keys['ShiftLeft'] || !!keys['ShiftRight'];
  state.ducking = (!!keys['ControlLeft'] || !!keys['ControlRight']) && !state.onBoard && !state.climbing;

  // --- Climbing state machine ---
  if(state.climbing){
    modeLabel.textContent = 'CLIMBING';
    const upInput = (keys['KeyW']||keys['ArrowUp']) ? 1 : (keys['KeyS']||keys['ArrowDown']) ? -1 : 0;
    p.y += upInput * CLIMB_SPEED * dt;
    p.x = climbWall.faceX + 0.5;
    p.z = THREE.MathUtils.clamp(p.z, climbWall.mesh.position.z-4.6, climbWall.mesh.position.z+4.6);
    state.vel.set(0,0,0);
    if(p.y >= climbWall.topY + 0.4 || keys['Space']){
      state.climbing = false;
      state.grounded = false;
    }
    updateCameraAndAnim(dt);
    updateProximity();
    renderer.render(scene, camera);
    requestAnimationFrame(update);
    return;
  }

  const distToFace = Math.abs(p.x - climbWall.faceX);
  const withinZ = Math.abs(p.z - climbWall.mesh.position.z) < 4.6;
  if(!state.onBoard && withinZ && distToFace < 0.9 && p.x > climbWall.faceX && forwardInput>0 && p.y < climbWall.topY-0.5){
    state.climbing = true;
    modeLabel.textContent = 'CLIMBING';
  }

  let speed = state.ducking ? DUCK_SPEED : (state.sprinting ? SPRINT_SPEED : WALK_SPEED);
  if(state.onBoard) speed = state.sprinting ? BOARD_SPEED*1.25 : BOARD_SPEED;
  modeLabel.textContent = state.onBoard ? 'SKATEBOARD' : (state.ducking ? 'DUCKING' : (state.sprinting ? 'SPRINTING' : 'ON FOOT'));

  moveDir.set(0,0,0);
  if(forwardInput || strafeInput){
    const camForward = new THREE.Vector3(Math.sin(state.camYaw), 0, Math.cos(state.camYaw));
    const camRight = new THREE.Vector3(-camForward.z, 0, camForward.x);
    moveDir.addScaledVector(camForward, forwardInput);
    moveDir.addScaledVector(camRight, strafeInput);
    if(moveDir.lengthSq() > 0){
      moveDir.normalize();
      const targetYaw = Math.atan2(moveDir.x, moveDir.z);
      let dyaw = targetYaw - state.yaw;
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
      const turnRate = state.onBoard ? 6 : 12;
      state.yaw += dyaw * Math.min(1, turnRate*dt);
    }
  }

  const moving = moveDir.lengthSq() > 0;
  state.speedAnim = THREE.MathUtils.lerp(state.speedAnim, moving ? 1 : 0, dt*8);

  const nextX = p.x + moveDir.x*speed*dt;
  const nextZ = p.z + moveDir.z*speed*dt;
  tmpV.set(nextX, 0, nextZ);
  resolveBlockers(tmpV);
  p.x = tmpV.x; p.z = tmpV.z;

  const floorY = groundHeightAt(p.x, p.z);
  if(floorY < -15){
    p.set(HUB.x, HUB.h, HUB.z+4);
    state.vel.set(0,0,0);
  } else {
    state.vel.y += GRAVITY*dt;
    p.y += state.vel.y*dt;
    if(p.y <= floorY+0.02){
      p.y = floorY;
      state.vel.y = 0;
      state.grounded = true;
    } else {
      state.grounded = p.y - floorY < 0.05;
    }
    if(state.grounded && keys['Space'] && !state.onBoard){
      state.vel.y = JUMP_SPEED;
      state.grounded = false;
    } else if(state.grounded && keys['Space'] && state.onBoard){
      state.vel.y = JUMP_SPEED*0.8;
      state.grounded = false;
    }
  }

  updateCameraAndAnim(dt);
  updateProximity();

  renderer.render(scene, camera);
  requestAnimationFrame(update);
}

function updateCameraAndAnim(dt){
  const p = player.position;
  player.rotation.y = state.yaw;

  const duckScale = state.ducking ? 0.62 : 1.0;
  player.scale.y = THREE.MathUtils.lerp(player.scale.y, duckScale, dt*10);

  const t = performance.now()*0.001;
  const swingSpeed = state.onBoard ? 0 : (state.sprinting ? 14 : 9);
  const amp = state.speedAnim * (state.sprinting?0.9:0.6);
  if(!state.onBoard){
    bodyParts.armL.rotation.x = Math.sin(t*swingSpeed) * amp;
    bodyParts.armR.rotation.x = -Math.sin(t*swingSpeed) * amp;
    bodyParts.legL.rotation.x = -Math.sin(t*swingSpeed) * amp;
    bodyParts.legR.rotation.x = Math.sin(t*swingSpeed) * amp;
  } else {
    bodyParts.armL.rotation.x = THREE.MathUtils.lerp(bodyParts.armL.rotation.x, -0.3, dt*6);
    bodyParts.armR.rotation.x = THREE.MathUtils.lerp(bodyParts.armR.rotation.x, -0.3, dt*6);
    bodyParts.legL.rotation.x = THREE.MathUtils.lerp(bodyParts.legL.rotation.x, 0.15, dt*6);
    bodyParts.legR.rotation.x = THREE.MathUtils.lerp(bodyParts.legR.rotation.x, -0.15, dt*6);
  }

  if(state.onBoard){
    skateboard.visible = true;
    skateboard.position.set(p.x, p.y+0.12, p.z);
    skateboard.rotation.y = state.yaw;
    const lean = THREE.MathUtils.clamp(-( state.camYaw - state.yaw ), -0.4, 0.4);
    skateboard.rotation.z = lean*0.4;
  }

  const camDist = state.sprinting ? 6.4 : 5.4;
  const camHeight = 2.0 + state.camPitch*3.2;
  const cx = p.x - Math.sin(state.camYaw)*camDist;
  const cz = p.z - Math.cos(state.camYaw)*camDist;
  const cy = p.y + camHeight;
  camera.position.lerp(new THREE.Vector3(cx,cy,cz), 1-Math.pow(0.001, dt));
  const lookTarget = new THREE.Vector3(p.x, p.y+1.15, p.z);
  camera.lookAt(lookTarget);
  const targetFov = state.sprinting ? 58 : 52;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt*4);
  camera.updateProjectionMatrix();
}
