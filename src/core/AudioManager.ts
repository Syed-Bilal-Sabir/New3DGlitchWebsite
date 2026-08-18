import { Howl, Howler } from 'howler'
import type { ZoneId } from '../types'

type TrackConfig = {
  src: string[]
  volume: number
}

const TRACKS: Partial<Record<ZoneId | 'global', TrackConfig>> = {
  // Add your production audio files when ready.
  // global: { src: ['/audio/global-ambience.mp3'], volume: 0.24 },
  // 'last-dehar': { src: ['/audio/last-dehar-wind.mp3'], volume: 0.38 },
  // 'pirates-attack': { src: ['/audio/pirates-ocean.mp3'], volume: 0.28 }
}

export class AudioManager {
  private tracks = new Map<string, Howl>()
  private currentZone?: string
  private unlocked = false

  constructor() {
    Howler.volume(1)
    for (const [key, config] of Object.entries(TRACKS)) {
      if (!config) continue
      this.tracks.set(
        key,
        new Howl({
          src: config.src,
          loop: true,
          volume: 0,
          preload: true
        })
      )
    }
  }

  unlock() {
    if (this.unlocked) return
    this.unlocked = true

    const global = this.tracks.get('global')
    if (global && !global.playing()) {
      global.play()
      global.fade(0, TRACKS.global?.volume ?? 0.2, 900)
    }
  }

  setZone(zoneId?: ZoneId) {
    if (!this.unlocked || this.currentZone === zoneId) return

    if (this.currentZone) {
      const previous = this.tracks.get(this.currentZone)
      if (previous?.playing()) {
        previous.fade(previous.volume(), 0, 650)
        setTimeout(() => previous.stop(), 700)
      }
    }

    this.currentZone = zoneId

    if (!zoneId) return
    const next = this.tracks.get(zoneId)
    const config = TRACKS[zoneId]
    if (next && config) {
      next.play()
      next.fade(0, config.volume, 900)
    }
  }

  mute(value: boolean) {
    Howler.mute(value)
  }
}
