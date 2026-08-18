import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Scene
} from 'three'
import type { ZoneData } from '../types'

export class ZoneEffects {
  private scene: Scene
  private particles: Points
  private material: PointsMaterial
  private currentColor = new Color(0x35d7ff)
  private targetColor = new Color(0x35d7ff)

  constructor(scene: Scene) {
    this.scene = scene

    const count = 1200
    const positions: number[] = []
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 8 + Math.random() * 65
      positions.push(
        Math.cos(a) * r,
        1.5 + Math.random() * 22,
        Math.sin(a) * r
      )
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new Float32BufferAttribute(positions, 3)
    )

    this.material = new PointsMaterial({
      color: this.currentColor,
      size: 0.12,
      transparent: true,
      opacity: 0.42,
      blending: AdditiveBlending,
      depthWrite: false
    })

    this.particles = new Points(geometry, this.material)
    this.scene.add(this.particles)
  }

  setZone(zone?: ZoneData) {
    this.targetColor.setHex(zone?.theme.accent ?? 0x35d7ff)

    if (zone?.id === 'last-dehar') {
      this.material.size = 0.2
      this.material.opacity = 0.7
    } else if (zone?.id === 'puzzle-warrior') {
      this.material.size = 0.16
      this.material.opacity = 0.62
    } else {
      this.material.size = 0.12
      this.material.opacity = 0.42
    }
  }

  update(dt: number, zone?: ZoneData) {
    this.currentColor.lerp(this.targetColor, Math.min(1, dt * 2))
    this.material.color.copy(this.currentColor)

    const speed = zone?.id === 'last-dehar' ? 0.08 : 0.025
    this.particles.rotation.y += dt * speed
    this.particles.position.y =
      Math.sin(performance.now() * 0.0004) * 0.3
  }
}
