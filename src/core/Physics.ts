import RAPIER from '@dimforge/rapier3d-compat'
import { Vector3 } from 'three'
import type { ZoneData } from '../types'

export class Physics {
  public world!: RAPIER.World
  private controller!: RAPIER.KinematicCharacterController
  private playerBody!: RAPIER.RigidBody
  private playerCollider!: RAPIER.Collider
  private ready = false

  async init(zones: ZoneData[]) {
    await RAPIER.init()

    this.world = new RAPIER.World({ x: 0, y: 0, z: 0 })

    this.playerBody = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 1.5, 10)
    )

    this.playerCollider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(1.15)
        .setFriction(0.2)
        .setRestitution(0.05),
      this.playerBody
    )

    this.controller = this.world.createCharacterController(0.08)
    this.controller.setSlideEnabled(true)
    this.controller.setApplyImpulsesToDynamicBodies(false)

    // Island boundary.
    this.world.createCollider(
      RAPIER.ColliderDesc.cylinder(2.0, 72.0).setTranslation(0, -2.0, 0)
    )

    // Simple production-safe landmark collision approximations.
    for (const zone of zones) {
      const r = zone.id === 'hq' ? 7.4 : 4.8
      const h = zone.id === 'contact' ? 7.5 : 3.5
      this.world.createCollider(
        RAPIER.ColliderDesc.cylinder(h, r).setTranslation(
          zone.position.x,
          h,
          zone.position.z
        )
      )
    }

    this.world.step()
    this.ready = true
  }

  isReady() {
    return this.ready
  }

  movePlayer(current: Vector3, desiredDelta: Vector3) {
    if (!this.ready) return current.clone().add(desiredDelta)

    this.playerBody.setTranslation(
      { x: current.x, y: current.y, z: current.z },
      true
    )

    this.controller.computeColliderMovement(this.playerCollider, {
      x: desiredDelta.x,
      y: desiredDelta.y,
      z: desiredDelta.z
    })

    const corrected = this.controller.computedMovement()
    const next = new Vector3(
      current.x + corrected.x,
      current.y + corrected.y,
      current.z + corrected.z
    )

    this.playerBody.setNextKinematicTranslation({
      x: next.x,
      y: next.y,
      z: next.z
    })

    this.world.step()
    return next
  }

  setPlayerPosition(position: Vector3) {
    if (!this.ready) return
    this.playerBody.setTranslation(
      { x: position.x, y: position.y, z: position.z },
      true
    )
    this.playerBody.setNextKinematicTranslation(
      { x: position.x, y: position.y, z: position.z }
    )
    this.world.step()
  }

  cameraDistance(origin: Vector3, desired: Vector3, padding = 0.65) {
    if (!this.ready) return origin.distanceTo(desired)

    const dir = desired.clone().sub(origin)
    const maxDistance = dir.length()
    if (maxDistance <= 0.001) return maxDistance

    dir.normalize()
    const ray = new RAPIER.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: dir.x, y: dir.y, z: dir.z }
    )

    const hit = this.world.castRay(ray, maxDistance, true)
    if (!hit) return maxDistance

    return Math.max(2.8, hit.timeOfImpact - padding)
  }
}
