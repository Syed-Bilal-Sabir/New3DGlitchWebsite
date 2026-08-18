import { Group, Scene, Vector3, WebGLRenderer } from 'three'
import { AssetLoader } from './AssetLoader'
import type { ZoneData, ZoneId } from '../types'

const MODEL_PATHS: Partial<Record<ZoneId, string>> = {
  hq: '/models/hq.glb',
  'puzzle-warrior': '/models/puzzle-warrior.glb',
  'last-dehar': '/models/last-dehar.glb',
  'water-valves': '/models/water-valves.glb',
  'pirates-attack': '/models/pirates-attack.glb',
  careers: '/models/careers.glb',
  contact: '/models/signal-tower.glb',
  lab: '/models/experiment-lab.glb'
}

type LoadedZone = {
  object: Group
  lastUsed: number
}

export class ZoneStreamer {
  private loader: AssetLoader
  private scene: Scene
  private loaded = new Map<ZoneId, LoadedZone>()
  private failed = new Set<ZoneId>()
  private loading = new Set<ZoneId>()
  private keepDistance = 42
  private loadDistance = 31

  constructor(scene: Scene, renderer: WebGLRenderer) {
    this.scene = scene
    this.loader = new AssetLoader(renderer)
  }

  async update(player: Vector3, zones: ZoneData[]) {
    const now = performance.now()

    for (const zone of zones) {
      const distance = player.distanceTo(zone.position)

      if (distance < this.loadDistance) {
        const loaded = this.loaded.get(zone.id)
        if (loaded) {
          loaded.lastUsed = now
        } else {
          void this.loadZone(zone)
        }
      }
    }

    for (const [id, loaded] of this.loaded) {
      const zone = zones.find(z => z.id === id)
      if (!zone) continue

      const distance = player.distanceTo(zone.position)
      if (distance > this.keepDistance && now - loaded.lastUsed > 8000) {
        this.scene.remove(loaded.object)
        this.loader.disposeObject(loaded.object)
        this.loaded.delete(id)
      }
    }
  }

  private async loadZone(zone: ZoneData) {
    if (
      this.loaded.has(zone.id) ||
      this.loading.has(zone.id) ||
      this.failed.has(zone.id)
    ) return

    const path = MODEL_PATHS[zone.id]
    if (!path) return

    this.loading.add(zone.id)
    const model = await this.loader.tryLoadGLB(path)
    this.loading.delete(zone.id)

    if (!model) {
      this.failed.add(zone.id)
      return
    }

    model.position.copy(zone.position)
    model.userData.productionAsset = true
    this.scene.add(model)
    this.loaded.set(zone.id, {
      object: model,
      lastUsed: performance.now()
    })
  }
}
