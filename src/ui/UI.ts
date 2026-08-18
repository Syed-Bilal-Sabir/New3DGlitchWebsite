import type { ZoneData } from '../types'
import { zones } from '../data/zones'

export class UI {
  private prompt!: HTMLElement
  private panel!: HTMLElement
  private panelTitle!: HTMLElement
  private panelEyebrow!: HTMLElement
  private panelDescription!: HTMLElement
  private panelTags!: HTMLElement
  private intro!: HTMLElement
  private map!: HTMLElement
  private touchStick!: HTMLElement
  private touchKnob!: HTMLElement
  private loading!: HTMLElement
  private loadingText!: HTMLElement
  private touch = { x: 0, y: 0 }
  private interacting = false

  constructor(
    onTeleport: (zone: ZoneData) => void,
    onExploreToggle: (enabled: boolean) => void,
    onAudioUnlock: () => void
  ) {
    const root = document.querySelector<HTMLElement>('#app')!

    root.innerHTML = `
      <canvas id="experience"></canvas>

      <div id="loading" class="boot">
        <div class="boot-mark">G</div>
        <div class="boot-bar"><i></i></div>
        <div id="loadingText" class="boot-text">INITIALIZING WORLD</div>
      </div>

      <header class="hud">
        <button class="brand" data-nav="hq">GLITCH<span>GAMES</span></button>
        <div class="hud-actions">
          <button id="audioButton" class="ghost">AUDIO ON</button>
          <button id="mapButton" class="ghost">MAP</button>
          <button id="quickButton" class="ghost">QUICK MODE</button>
        </div>
      </header>

      <div class="zone-chip" id="zoneChip">GLITCH HQ</div>

      <div class="hint">
        <span><b>WASD</b> MOVE</span>
        <span><b>SHIFT</b> BOOST</span>
        <span><b>E</b> INTERACT</span>
        <span><b>R</b> RESPAWN</span>
      </div>

      <div id="prompt" class="prompt hidden"></div>

      <aside id="panel" class="project-panel hidden">
        <div class="project-media">
          <div class="project-media-placeholder">
            <span id="panelMediaTitle">PROJECT EXPERIENCE</span>
          </div>
        </div>
        <button id="closePanel" class="close">×</button>
        <div class="eyebrow" id="panelEyebrow"></div>
        <h2 id="panelTitle"></h2>
        <p id="panelDescription"></p>
        <div id="panelTags" class="tags"></div>
        <div class="panel-actions">
          <a href="#" class="primary" onclick="return false;">VIEW CASE STUDY</a>
          <a href="#" class="secondary" onclick="return false;">WATCH TRAILER</a>
        </div>
      </aside>

      <div id="map" class="modal hidden">
        <div class="modal-card">
          <button id="closeMap" class="close">×</button>
          <div class="eyebrow">WORLD MAP</div>
          <h2>Choose a destination</h2>
          <div class="nav-grid">
            ${zones.map(z => `
              <button data-zone="${z.id}">
                <span>${z.eyebrow}</span>
                <strong>${z.title}</strong>
                <small>${z.tags.join(' • ')}</small>
              </button>`).join('')}
          </div>
        </div>
      </div>

      <div id="intro" class="intro">
        <div class="intro-card">
          <div class="eyebrow">GLITCH GAMES / V3</div>
          <h1>ENTER THE <span>GLITCH</span></h1>
          <p>A playable portfolio where each game becomes a place you can physically discover.</p>
          <div class="intro-actions">
            <button id="exploreBtn" class="primary">EXPLORE MODE</button>
            <button id="quickBtnIntro" class="secondary">QUICK MODE</button>
          </div>
          <div class="intro-note">WASD / Shift / E on desktop • Touch controls on mobile</div>
        </div>
      </div>

      <div id="touchControls" class="touch-controls">
        <div id="touchStick" class="touch-stick"><div id="touchKnob" class="touch-knob"></div></div>
        <button id="touchInteract" class="touch-action">E</button>
      </div>
    `

    this.prompt = document.querySelector('#prompt')!
    this.panel = document.querySelector('#panel')!
    this.panelTitle = document.querySelector('#panelTitle')!
    this.panelEyebrow = document.querySelector('#panelEyebrow')!
    this.panelDescription = document.querySelector('#panelDescription')!
    this.panelTags = document.querySelector('#panelTags')!
    this.intro = document.querySelector('#intro')!
    this.map = document.querySelector('#map')!
    this.touchStick = document.querySelector('#touchStick')!
    this.touchKnob = document.querySelector('#touchKnob')!
    this.loading = document.querySelector('#loading')!
    this.loadingText = document.querySelector('#loadingText')!

    document.querySelector('#exploreBtn')!.addEventListener('click', () => {
      onAudioUnlock()
      this.intro.classList.add('hidden')
      onExploreToggle(true)
    })

    const openQuick = () => {
      onAudioUnlock()
      this.intro.classList.add('hidden')
      this.map.classList.remove('hidden')
      onExploreToggle(false)
    }

    document.querySelector('#quickBtnIntro')!.addEventListener('click', openQuick)
    document.querySelector('#quickButton')!.addEventListener('click', openQuick)
    document.querySelector('#mapButton')!.addEventListener('click', () => this.map.classList.remove('hidden'))
    document.querySelector('#closeMap')!.addEventListener('click', () => this.map.classList.add('hidden'))
    document.querySelector('#closePanel')!.addEventListener('click', () => this.panel.classList.add('hidden'))

    let muted = false
    document.querySelector('#audioButton')!.addEventListener('click', (event) => {
      muted = !muted
      ;(event.currentTarget as HTMLElement).textContent = muted ? 'AUDIO OFF' : 'AUDIO ON'
      window.dispatchEvent(new CustomEvent('glitch-audio-mute', { detail: muted }))
    })

    document.querySelectorAll<HTMLElement>('[data-zone]').forEach((el) => {
      el.addEventListener('click', () => {
        const zone = zones.find(z => z.id === el.dataset.zone)
        if (!zone) return
        this.map.classList.add('hidden')
        onTeleport(zone)
      })
    })

    document.querySelectorAll<HTMLElement>('[data-nav="hq"]').forEach((el) => {
      el.addEventListener('click', () => onTeleport(zones[0]))
    })

    document.querySelector('#touchInteract')!.addEventListener('pointerdown', () => {
      this.interacting = true
      setTimeout(() => this.interacting = false, 140)
    })

    this.setupTouchStick()
  }

  setBootStatus(text: string) {
    this.loadingText.textContent = text
  }

  hideBoot() {
    this.loading.classList.add('boot-out')
    setTimeout(() => this.loading.remove(), 600)
  }

  private setupTouchStick() {
    const max = 38
    let pointerId: number | null = null

    const update = (event: PointerEvent) => {
      const rect = this.touchStick.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      let dx = event.clientX - cx
      let dy = event.clientY - cy
      const len = Math.hypot(dx, dy)

      if (len > max) {
        dx = dx / len * max
        dy = dy / len * max
      }

      this.touch.x = dx / max
      this.touch.y = dy / max
      this.touchKnob.style.transform = `translate(${dx}px, ${dy}px)`
    }

    this.touchStick.addEventListener('pointerdown', (event) => {
      pointerId = event.pointerId
      this.touchStick.setPointerCapture(pointerId)
      update(event)
    })

    this.touchStick.addEventListener('pointermove', (event) => {
      if (pointerId === event.pointerId) update(event)
    })

    const end = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      pointerId = null
      this.touch.x = 0
      this.touch.y = 0
      this.touchKnob.style.transform = 'translate(0px, 0px)'
    }

    this.touchStick.addEventListener('pointerup', end)
    this.touchStick.addEventListener('pointercancel', end)
  }

  getAnalog() {
    return this.touch
  }

  consumeInteract() {
    const value = this.interacting
    this.interacting = false
    return value
  }

  setNearby(zone?: ZoneData) {
    if (!zone) {
      this.prompt.classList.add('hidden')
      return
    }

    this.prompt.textContent = `E  —  ${zone.cta}`
    this.prompt.classList.remove('hidden')
  }

  setActiveZone(zone?: ZoneData) {
    const chip = document.querySelector('#zoneChip')!
    chip.textContent = zone?.title?.toUpperCase() ?? 'GLITCH WORLD'
  }

  open(zone: ZoneData) {
    this.panelEyebrow.textContent =
      zone.status ? `${zone.eyebrow} • ${zone.status}` : zone.eyebrow
    this.panelTitle.textContent = zone.title
    this.panelDescription.textContent = zone.description
    this.panelTags.innerHTML = zone.tags.map(tag => `<span>${tag}</span>`).join('')
    const media = document.querySelector('#panelMediaTitle')!
    media.textContent = zone.title.toUpperCase()
    ;(media.parentElement as HTMLElement).style.setProperty('--media-accent', `#${zone.color.toString(16).padStart(6, '0')}`)
    this.panel.classList.remove('hidden')
  }
}
