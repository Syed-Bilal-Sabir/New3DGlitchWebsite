import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3
} from 'three'
import { Input } from '../core/Input'
import type { Physics } from '../core/Physics'

export class Drone {
  public object = new Group()
  public velocity = new Vector3()
  private input: Input
  private physics?: Physics
  private speed = 15
  private boostSpeed = 26
  private turnSmooth = 8

  constructor(input: Input) {
    this.input = input
    this.object.position.set(0, 1.5, 10)

    const bodyMat = new MeshStandardMaterial({
      color: 0x161e2a,
      metalness: 0.82,
      roughness: 0.22
    })

    const glowMat = new MeshStandardMaterial({
      color: 0x36ddff,
      emissive: 0x36ddff,
      emissiveIntensity: 4.5
    })

    const body = new Mesh(new SphereGeometry(1.25, 28, 18), bodyMat)
    body.scale.set(1.2, 0.45, 1.0)
    body.castShadow = true
    this.object.add(body)

    const core = new Mesh(new TorusGeometry(0.68, 0.13, 10, 40), glowMat)
    core.rotation.x = Math.PI / 2
    core.position.y = 0.28
    this.object.add(core)

    const armGeo = new BoxGeometry(3.3, 0.11, 0.2)
    const armA = new Mesh(armGeo, bodyMat)
    armA.rotation.y = Math.PI / 4
    const armB = armA.clone()
    armB.rotation.y = -Math.PI / 4
    this.object.add(armA, armB)

    const podGeo = new SphereGeometry(0.33, 16, 10)
    for (const [x, z] of [[1.18, 1.18], [-1.18, 1.18], [1.18, -1.18], [-1.18, -1.18]]) {
      const pod = new Mesh(podGeo, glowMat)
      pod.position.set(x, -0.03, z)
      this.object.add(pod)
    }
  }

  attachPhysics(physics: Physics) {
    this.physics = physics
    this.physics.setPlayerPosition(this.object.position)
  }

  update(dt: number, analog = { x: 0, y: 0 }) {
    const keyboard = new Vector3(
      Number(this.input.down('KeyD', 'ArrowRight')) - Number(this.input.down('KeyA', 'ArrowLeft')),
      0,
      Number(this.input.down('KeyS', 'ArrowDown')) - Number(this.input.down('KeyW', 'ArrowUp'))
    )

    const input = new Vector3(
      keyboard.x + analog.x,
      0,
      keyboard.z + analog.y
    )

    if (input.lengthSq() > 1) input.normalize()

    const boosting = this.input.down('ShiftLeft', 'ShiftRight')
    const targetSpeed = boosting ? this.boostSpeed : this.speed
    const desiredVelocity = input.multiplyScalar(targetSpeed)

    this.velocity.lerp(desiredVelocity, Math.min(1, dt * 6.5))

    const desiredDelta = this.velocity.clone().multiplyScalar(dt)
    let next = this.object.position.clone().add(desiredDelta)

    if (this.physics?.isReady()) {
      next = this.physics.movePlayer(this.object.position, desiredDelta)
    }

    const islandRadius = 67
    const flatLength = Math.hypot(next.x, next.z)
    if (flatLength > islandRadius) {
      const scale = islandRadius / flatLength
      next.x *= scale
      next.z *= scale
      this.velocity.multiplyScalar(0.6)
    }

    const bob = Math.sin(performance.now() * 0.0034) * 0.09
    next.y = 1.5 + bob
    this.object.position.copy(next)

    if (this.velocity.lengthSq() > 0.12) {
      const heading = Math.atan2(this.velocity.x, this.velocity.z)
      let delta = heading - this.object.rotation.y
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      this.object.rotation.y += delta * Math.min(1, dt * this.turnSmooth)
      this.object.rotation.z +=
        (-this.velocity.x * 0.013 - this.object.rotation.z) *
        Math.min(1, dt * 6)
      this.object.rotation.x +=
        (this.velocity.z * 0.008 - this.object.rotation.x) *
        Math.min(1, dt * 6)
    } else {
      this.object.rotation.z *= 0.9
      this.object.rotation.x *= 0.9
    }
  }

  teleport(position: Vector3) {
    this.object.position.copy(position)
    this.velocity.set(0, 0, 0)
    this.physics?.setPlayerPosition(position)
  }

  respawn() {
    this.teleport(new Vector3(0, 1.5, 10))
  }
}
