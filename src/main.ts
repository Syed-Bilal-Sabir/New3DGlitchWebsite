import './styles.css'
import {
  Clock,
  PerspectiveCamera,
  Vector3,
  WebGLRenderer,
  ACESFilmicToneMapping,
  SRGBColorSpace
} from 'three'
import { Input } from './core/Input'
import { World } from './core/World'
import { Physics } from './core/Physics'
import { AudioManager } from './core/AudioManager'
import { ZoneStreamer } from './core/ZoneStreamer'
import { ZoneEffects } from './effects/ZoneEffects'
import { Drone } from './player/Drone'
import { UI } from './ui/UI'
import { zones } from './data/zones'
import type { ZoneData } from './types'

const input = new Input()
const world = new World()
const drone = new Drone(input)
world.scene.add(drone.object)

const renderer = new WebGLRenderer({
  canvas: document.createElement('canvas'),
  antialias: true,
  powerPreference: 'high-performance'
})
renderer.domElement.id = 'experience'
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.outputColorSpace = SRGBColorSpace
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.08

const camera = new PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  320
)
camera.position.set(12, 14, 20)

const physics = new Physics()
const audio = new AudioManager()
const streamer = new ZoneStreamer(world.scene, renderer)
const effects = new ZoneEffects(world.scene)

let exploreEnabled = false
let nearby: ZoneData | undefined
let activeZone: ZoneData | undefined = zones[0]
let previousZoneId = activeZone.id
let interactCooldown = 0

const camTarget = new Vector3()
const desiredCamera = new Vector3()
const cameraOrigin = new Vector3()
const cameraDirection = new Vector3()

const ui = new UI(
  (zone) => {
    const destination = zone.position.clone().add(
      new Vector3(0, 1.5, zone.id === 'contact' ? 12 : 10)
    )

    drone.teleport(destination)
    activeZone = zone
    ui.setActiveZone(zone)

    if (zone.id !== 'hq') ui.open(zone)
  },
  (enabled) => {
    exploreEnabled = enabled
  },
  () => audio.unlock()
)

window.addEventListener('glitch-audio-mute', ((event: CustomEvent<boolean>) => {
  audio.mute(event.detail)
}) as EventListener)

const placeholder = document.querySelector('#experience')
placeholder?.replaceWith(renderer.domElement)

const clock = new Clock()

function nearestZone(radiusScale = 1): ZoneData | undefined {
  let best: ZoneData | undefined
  let bestDist = Infinity

  for (const zone of zones) {
    const dx = drone.object.position.x - zone.position.x
    const dz = drone.object.position.z - zone.position.z
    const distance = Math.hypot(dx, dz)

    if (distance < zone.radius * radiusScale && distance < bestDist) {
      best = zone
      bestDist = distance
    }
  }

  return best
}

async function boot() {
  ui.setBootStatus('INITIALIZING PHYSICS')
  await physics.init(zones)
  drone.attachPhysics(physics)

  ui.setBootStatus('PREPARING EXPERIENCE')
  await streamer.update(drone.object.position, zones)

  ui.hideBoot()
  tick()
}

function tick() {
  const dt = Math.min(clock.getDelta(), 0.033)
  interactCooldown = Math.max(0, interactCooldown - dt)

  if (exploreEnabled) {
    drone.update(dt, ui.getAnalog())
  }

  nearby = nearestZone(1)
  activeZone = nearestZone(1.75) ?? activeZone

  if (activeZone?.id !== previousZoneId) {
    previousZoneId = activeZone?.id ?? 'hq'
    effects.setZone(activeZone)
    audio.setZone(activeZone?.id)
  }

  ui.setNearby(nearby)
  ui.setActiveZone(activeZone)

  world.applyTheme(activeZone)
  world.update(performance.now() * 0.001, activeZone)
  effects.update(dt, activeZone)
  void streamer.update(drone.object.position, zones)

  const interact = input.down('KeyE') || ui.consumeInteract()
  if (interact && nearby && interactCooldown <= 0) {
    ui.open(nearby)
    interactCooldown = 0.45
  }

  if (input.down('KeyR')) {
    drone.respawn()
    activeZone = zones[0]
  }

  camTarget.copy(drone.object.position)
  camTarget.y += 0.75

  const speed = Math.min(drone.velocity.length() / 26, 1)

  desiredCamera.set(
    drone.object.position.x + 11 + speed * 2.2,
    drone.object.position.y + 11.5 + speed * 1.2,
    drone.object.position.z + 16 + speed * 3.2
  )

  cameraOrigin.copy(camTarget)
  cameraDirection.copy(desiredCamera).sub(cameraOrigin)
  const desiredDistance = cameraDirection.length()
  const safeDistance = physics.cameraDistance(
    cameraOrigin,
    desiredCamera,
    0.8
  )

  cameraDirection.normalize()
  desiredCamera.copy(cameraOrigin).addScaledVector(
    cameraDirection,
    Math.min(desiredDistance, safeDistance)
  )

  camera.position.lerp(
    desiredCamera,
    1 - Math.pow(0.002, dt)
  )

  camera.lookAt(camTarget)

  camera.fov += ((50 + speed * 5.5) - camera.fov) * 0.05
  camera.updateProjectionMatrix()

  renderer.render(world.scene, camera)
  requestAnimationFrame(tick)
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55))
})

ui.setActiveZone(zones[0])
effects.setZone(zones[0])

boot().catch((error) => {
  console.error(error)
  ui.setBootStatus('FAILED TO INITIALIZE')
})
