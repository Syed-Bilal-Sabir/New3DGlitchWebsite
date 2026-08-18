import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Float32BufferAttribute,
  FogExp2,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  SphereGeometry,
  TorusGeometry
} from 'three'
import { zones } from '../data/zones'
import type { ZoneData } from '../types'

export class World {
  public scene = new Scene()
  public ambient: AmbientLight
  public key: DirectionalLight
  private zoneGroups = new Map<string, Group>()
  private particles: Points

  constructor() {
    this.scene.background = new Color(0x07101a)
    this.scene.fog = new FogExp2(0x07101a, 0.010)

    this.ambient = new AmbientLight(0x9cc8ff, 1.8)
    this.scene.add(this.ambient)

    this.key = new DirectionalLight(0xffffff, 4.5)
    this.key.position.set(18, 34, 14)
    this.key.castShadow = true
    this.key.shadow.mapSize.set(2048, 2048)
    this.scene.add(this.key)

    this.createGround()
    this.createRoadNetwork()
    this.createZones()
    this.particles = this.createAmbientParticles()
    this.scene.add(this.particles)
  }

  update(time: number, activeZone?: ZoneData) {
    for (const [id, group] of this.zoneGroups) {
      const beacon = group.userData.beacon as Mesh | undefined
      const hero = group.userData.hero as Mesh | undefined
      if (beacon) {
        const active = activeZone?.id === id
        const s = 1 + Math.sin(time * 2 + group.position.x) * 0.035 + (active ? 0.08 : 0)
        beacon.scale.setScalar(s)
        beacon.rotation.z += 0.002
      }
      if (hero) {
        hero.rotation.y += 0.0025
        hero.position.y = hero.userData.baseY + Math.sin(time * 1.4 + group.position.z) * 0.12
      }
    }
    this.particles.rotation.y += 0.0002
  }

  applyTheme(zone?: ZoneData) {
    const theme = zone?.theme ?? zones[0].theme
    const bg = new Color(theme.fog)
    this.scene.background = bg
    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.color.lerp(bg, 0.06)
      this.scene.fog.density += (theme.fogDensity - this.scene.fog.density) * 0.04
    }
    this.ambient.color.lerp(new Color(theme.ambient), 0.05)
  }

  private createGround() {
    const ground = new Mesh(
      new CylinderGeometry(72, 77, 4, 64),
      new MeshStandardMaterial({ color: 0x101923, roughness: 0.94, metalness: 0.03 })
    )
    ground.position.y = -2
    ground.receiveShadow = true
    this.scene.add(ground)

    const water = new Mesh(
      new CylinderGeometry(86, 86, 0.5, 64),
      new MeshStandardMaterial({
        color: 0x071727,
        roughness: 0.24,
        metalness: 0.12,
        emissive: 0x06111d,
        emissiveIntensity: 0.25
      })
    )
    water.position.y = -3.6
    this.scene.add(water)
  }

  private road(x: number, z: number, w: number, h: number, rotation = 0) {
    const road = new Mesh(
      new PlaneGeometry(w, h),
      new MeshStandardMaterial({ color: 0x222c39, roughness: 0.82, metalness: 0.12 })
    )
    road.rotation.x = -Math.PI / 2
    road.rotation.z = rotation
    road.position.set(x, 0.03, z)
    road.receiveShadow = true
    this.scene.add(road)
  }

  private createRoadNetwork() {
    this.road(0, 6, 9, 94)
    this.road(0, 0, 70, 9)
    this.road(-15, 11, 38, 7, -0.58)
    this.road(17, 12, 38, 7, 0.53)
    this.road(-14, -13, 40, 7, 0.65)
    this.road(16, -11, 38, 7, -0.56)
  }

  private createZones() {
    for (const zone of zones) {
      const group = new Group()
      group.position.copy(zone.position)
      group.userData.zone = zone

      const pad = new Mesh(
        new CylinderGeometry(zone.id === 'hq' ? 10 : 6.8, zone.id === 'hq' ? 11 : 7.8, zone.id === 'hq' ? 3.6 : 2.1, 20),
        new MeshStandardMaterial({ color: 0x182230, metalness: 0.38, roughness: 0.47 })
      )
      pad.position.y = zone.id === 'hq' ? 1.8 : 1.05
      pad.castShadow = true
      pad.receiveShadow = true
      group.add(pad)

      const beacon = new Mesh(
        new TorusGeometry(zone.radius * 0.62, 0.11, 10, 72),
        new MeshStandardMaterial({
          color: zone.color,
          emissive: zone.color,
          emissiveIntensity: 4.2,
          metalness: 0.15,
          roughness: 0.3
        })
      )
      beacon.rotation.x = Math.PI / 2
      beacon.position.y = 0.18
      group.userData.beacon = beacon
      group.add(beacon)

      this.createZoneLandmark(zone, group)

      this.zoneGroups.set(zone.id, group)
      this.scene.add(group)
    }
  }

  private createZoneLandmark(zone: ZoneData, group: Group) {
    const glowMat = new MeshStandardMaterial({
      color: zone.color,
      emissive: zone.color,
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.32
    })
    const darkMat = new MeshStandardMaterial({
      color: 0x1c2533,
      metalness: 0.5,
      roughness: 0.38
    })

    let hero: Mesh

    switch (zone.id) {
      case 'hq': {
        hero = new Mesh(new TorusGeometry(4.2, 0.8, 16, 48), glowMat)
        hero.rotation.x = Math.PI / 2
        hero.position.y = 4.6
        group.add(hero)

        const tower = new Mesh(new CylinderGeometry(3.5, 4.6, 5, 10), darkMat)
        tower.position.y = 3.9
        tower.castShadow = true
        group.add(tower)
        break
      }
      case 'puzzle-warrior': {
        hero = new Mesh(new IcosahedronGeometry(3.2, 1), glowMat)
        hero.position.y = 5.4
        hero.scale.y = 1.45
        group.add(hero)

        for (let i = 0; i < 7; i++) {
          const shard = new Mesh(new ConeGeometry(0.65, 3.2, 5), glowMat)
          const a = i / 7 * Math.PI * 2
          shard.position.set(Math.cos(a) * 4.5, 2.1, Math.sin(a) * 4.5)
          shard.rotation.z = 0.25
          group.add(shard)
        }
        break
      }
      case 'last-dehar': {
        hero = new Mesh(new ConeGeometry(4, 9, 5), darkMat)
        hero.position.y = 5.4
        group.add(hero)

        for (let i = 0; i < 12; i++) {
          const pine = new Mesh(new ConeGeometry(0.75 + (i % 3) * 0.2, 3.5 + (i % 4), 7), darkMat)
          const a = i / 12 * Math.PI * 2
          pine.position.set(Math.cos(a) * (5 + i % 2), 2, Math.sin(a) * (5 + i % 2))
          group.add(pine)
        }
        break
      }
      case 'water-valves': {
        hero = new Mesh(new CylinderGeometry(2.2, 2.2, 7, 16), glowMat)
        hero.position.y = 4.8
        group.add(hero)
        const ring = new Mesh(new TorusGeometry(3.6, 0.55, 12, 32), glowMat)
        ring.position.y = 4
        ring.rotation.x = Math.PI / 2
        group.add(ring)
        break
      }
      case 'pirates-attack': {
        hero = new Mesh(new BoxGeometry(7.5, 1.3, 3.6), darkMat)
        hero.position.y = 3.4
        hero.rotation.z = -0.05
        group.add(hero)
        const mast = new Mesh(new CylinderGeometry(0.22, 0.3, 8, 10), glowMat)
        mast.position.y = 7
        group.add(mast)
        break
      }
      case 'careers': {
        hero = new Mesh(new BoxGeometry(9, 6.5, 1), glowMat)
        hero.position.y = 5.2
        group.add(hero)
        break
      }
      case 'contact': {
        hero = new Mesh(new CylinderGeometry(0.8, 1.3, 12, 10), darkMat)
        hero.position.y = 7.2
        group.add(hero)
        for (let i = 0; i < 3; i++) {
          const ring = new Mesh(new TorusGeometry(2 + i * 0.9, 0.12, 8, 32), glowMat)
          ring.rotation.x = Math.PI / 2
          ring.position.y = 12 - i * 1.4
          group.add(ring)
        }
        break
      }
      default: {
        hero = new Mesh(new SphereGeometry(3.2, 20, 14), glowMat)
        hero.position.y = 4.7
        group.add(hero)
        const shell = new Mesh(new TorusGeometry(4.2, 0.45, 12, 36), darkMat)
        shell.rotation.x = Math.PI / 2
        shell.position.y = 4.6
        group.add(shell)
      }
    }

    hero.userData.baseY = hero.position.y
    group.userData.hero = hero
  }

  private createAmbientParticles() {
    const count = 850
    const positions = []
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 18 + Math.random() * 75
      positions.push(Math.cos(a) * r, 2 + Math.random() * 28, Math.sin(a) * r)
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
    const mat = new PointsMaterial({
      color: 0x7edfff,
      size: 0.08,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    })
    return new Points(geo, mat)
  }
}
