# Glitch Games — Interactive Studio World

An explorable, low-poly 3D portfolio site built with [Three.js](https://threejs.org/)
r0.160, loaded from jsDelivr via an import map — no build step, no npm install
required to run it.

## Files

```
glitch-games-world/
├── index.html          page structure, HUD markup, loading screen, panel markup,
│                        and the import map that points "three" at the CDN build
├── style.css            all visual styling (Chakra Petch / Inter type, purple theme)
├── main.js               scene setup, world layout, character controller, camera,
│                          zone/interaction system, render loop, and the asset loader
├── assets/                every 3D prop and the character, as individual .glb files
├── vercel.json            deployment config (clean URLs)
├── package.json            lets Vercel/npm recognize this as a project; no real deps
└── README.md
```

## The 3D assets (`/assets/*.glb`)

| File                        | What it is                                   | Used for |
|------------------------------|-----------------------------------------------|----------|
| `character.glb`              | The player rig — torso, head, visor, 2 arms, 2 legs as separate named nodes | Player character |
| `tree.glb`                   | Trunk + canopy                                | Scattered decoration (instanced ×70) |
| `rock.glb`                   | A single boulder                              | Scattered decoration (instanced ×50) |
| `skateboard.glb`             | Deck + 4 wheels                               | Mountable prop near the hub |
| `portal-ring-purple.glb`     | Glowing torus, purple                         | Zone entrance marker (all 5 zones) |
| `portal-ring-cyan.glb`       | Glowing torus, cyan                           | Alternate zone marker (not currently placed — swap in via `portal('portal-ring-cyan', ...)` in `main.js`) |
| `portfolio-pedestal.glb`     | Display pedestal + card                       | The 3 game pedestals in the Portfolio zone |
| `about-tent.glb`             | Tent roof + base                              | About zone landmark |
| `socials-totem.glb`          | Pole + 4 stacked cubes                        | Socials zone landmark |
| `contact-desk.glb`           | Desk + mailbox                                | Contact zone landmark |
| `hub-signpost.glb`           | Post + sign board                             | Hub plaza landmark |

**Terrain is intentionally *not* a `.glb`** — the ground, the 5 islands, the
connecting bridges, and the climbable cliff are still built procedurally in
`main.js`. That's because the character controller's ground-detection raycast
and the climb mechanic are tightly coupled to that geometry's exact shape.
Swapping those out safely means also updating the collision code — worth doing
later, but out of scope for a drop-in prop replacement.

## Replacing a prop with your own model

1. Export your model as **binary glTF (`.glb`)** from Blender / Maya / wherever
   you're working.
2. Keep the **filename** the same as the one it's replacing (e.g. your tree
   model → `assets/tree.glb`), or update the filename in the `ASSET_LIST`
   array and the `spawnModel(...)` / `scatterProp(...)` calls in `main.js`.
3. **Scale & origin matter.** Each prop is placed with its local origin at
   the point that touches the ground (or, for wall-mounted things, wherever
   makes sense for that prop) — model yours the same way, in meters, roughly
   matching the scale of the placeholder it replaces (see the "approx size"
   notes below) so it doesn't end up tiny or gigantic in the world.
   - `tree.glb`: ~2m tall, origin at the base of the trunk.
   - `rock.glb`: ~1.2m across, origin at the bottom.
   - `skateboard.glb`: ~1.7m long, origin at deck center.
   - `portal-ring-*.glb`: ~2.3m diameter ring, origin at ring center.
   - `portfolio-pedestal.glb` / `about-tent.glb` / `socials-totem.glb` /
     `contact-desk.glb` / `hub-signpost.glb`: origin at ground level, centered.
4. **`character.glb` is special.** The animation code drives specific named
   nodes every frame — your replacement rig needs objects named exactly
   `torso`, `head`, `armL`, `armR`, `legL`, `legR` somewhere in its hierarchy
   (nested however you like) for the walk-cycle/skate-lean animation to find
   them. If you're bringing in a fully rigged & animated character instead,
   see "Upgrading to a real animated rig" below — that replaces the procedural
   animation entirely, so the name requirement goes away.
5. Drop the file into `/assets`, reload the page. If a file is missing or
   fails to parse, that one prop falls back to a small magenta wireframe cube
   instead of breaking the whole site — check the browser console for which
   asset failed and why.

### How the assets in this repo were generated

They're not hand-modeled — I generated them programmatically with a small
Node script (`three.js` + `GLTFExporter`, run outside the browser) so the
in-browser file structure matches exactly what a real modeling pipeline would
produce. That script isn't part of the deployed site, but if you want to
regenerate or tweak the placeholders procedurally instead of modeling by hand,
the technique is: build the same primitive geometry in a Node script using the
`three` npm package, then call `GLTFExporter.parseAsync(scene, {binary:true})`
and write the resulting buffer to a `.glb` file.

## Upgrading to a real animated rig

Right now the character's walk/sprint/duck/skate poses are driven procedurally
(sine-wave limb rotation in `updateCameraAndAnim()` in `main.js`) rather than
by baked animation clips. To use a properly rigged & animated character instead:

1. Export your rigged character with animation clips (idle, walk, run, jump,
   climb, etc.) as `character.glb`.
2. In `main.js`, after `player = spawnModel('character', ...)`, create an
   `THREE.AnimationMixer(player)` and play/crossfade clips from `gltf.animations`
   (you'll need to keep the mixer's `gltf.animations` reference — `loadAllAssets`
   currently only keeps `gltf.scene`).
3. Replace the manual `bodyParts.*.rotation.x = ...` lines in
   `updateCameraAndAnim()` with `mixer.update(dt)` and clip-switching logic
   based on `state` (grounded/sprinting/ducking/onBoard/climbing).

## Run it locally

No build step. Either:

```bash
npx serve .
```
or
```bash
python3 -m http.server 8000
```

then open the printed local URL. **This project must be served over
`http://`, not opened via `file://`** — `fetch()` (used internally by the
glTF loader to read the `.glb` files) is blocked on the `file://` protocol
in most browsers.

## Deploy to Vercel

**Option A — Vercel CLI**
```bash
npm i -g vercel        # if you don't have it already
cd glitch-games-world
vercel                 # follow the prompts, accept defaults (static site, no build command)
vercel --prod           # promote to production once you're happy
```

**Option B — Git + Vercel dashboard**
1. Push this folder to a GitHub/GitLab/Bitbucket repo.
2. In the Vercel dashboard: **Add New → Project → Import** your repo.
3. Framework preset: **Other** (or "Static"). Build command: leave blank.
   Output directory: leave as root (`.`).
4. Deploy.

Either way, Vercel serves `index.html` at the root with no server-side code
involved — it's a plain static site, and `/assets/*.glb` are served as
static files automatically.

## Controls

| Action   | Key(s)                        |
|----------|--------------------------------|
| Move     | `W` `A` `S` `D` or arrow keys  |
| Sprint   | `Shift`                        |
| Jump     | `Space`                        |
| Duck     | `Ctrl`                          |
| Interact | `E`                             |
| Look     | Click + drag mouse             |

## How the world is structured (`main.js`)

- **Renderer / scene / lights** — top of the file. One shadow-casting directional
  light, a hemisphere light, and a shader-based gradient sky dome.
- **`MAT`** — the handful of materials still used for procedural terrain
  (ground, paths, the cliff). Props no longer use this — their materials
  live inside their `.glb` files.
- **Ground system** — `groundMeshes` is a list of meshes a downward raycast
  (`groundHeightAt`) checks each frame to find the floor height under the player.
  This is what lets the character walk up ramps and stand on multiple islands
  without a physics engine.
- **`blockers`** — simple radius-based horizontal colliders (trees, rocks, the cliff)
  that push the player out on overlap.
- **`makeIsland` / `bridgeBetween`** — builds the hub + 4 zone islands and the
  ramps connecting them (procedural terrain).
- **`loadAllAssets` / `models` / `spawnModel` / `instanceModel` / `scatterProp`**
  — the asset pipeline: loads every `.glb` once into `models{}`, then
  `spawnModel()` clones one into the scene at a position, and `scatterProp()` +
  `instanceModel()` place many copies of a prop cheaply via `InstancedMesh`
  (used for the trees and rocks).
- **Character** — loaded from `character.glb` via `spawnModel`; `bodyParts` is
  populated by name-lookup (`getObjectByName`) so the existing procedural
  walk-cycle code keeps working unchanged.
- **Climbing** — `climbWall` (procedural) + the climbing branch inside
  `update()`: pressing into the cliff face switches to a locked "climb" state
  until you reach the top.
- **Skateboard** — the `skateboard` clone + `state.onBoard` toggle in `tryInteract()`.
- **Zones** — `defineZone(...)` registers each portfolio/about/socials/contact
  area; `updateProximity()` checks distance each frame and shows the prompt/banner;
  `openPortfolioPanel()` etc. render the slide-in side panel content.
- **`update()`** — the main loop: reads input, resolves movement/gravity/collision,
  calls `updateCameraAndAnim()`, renders, and re-queues itself via `requestAnimationFrame`.

## Known limitations / good next steps

- Character animation is procedural (sine-wave limbs), not a baked/rigged
  animation clip — see "Upgrading to a real animated rig" above.
- No mobile/touch controls yet.
- No audio.
- Portfolio/team/social copy is placeholder — edit the `GAMES` array and the
  `open...Panel()` functions in `main.js` to swap in real content.
- Terrain (ground/islands/bridges/cliff) is procedural, not asset-based — see
  the note above on why, and what it'd take to change that.
