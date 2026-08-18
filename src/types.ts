import type { Vector3 } from 'three'

export type ZoneId =
  | 'hq'
  | 'puzzle-warrior'
  | 'last-dehar'
  | 'water-valves'
  | 'pirates-attack'
  | 'careers'
  | 'contact'
  | 'lab'

export interface ZoneTheme {
  fog: number
  fogDensity: number
  ambient: number
  accent: number
}

export interface ZoneData {
  id: ZoneId
  title: string
  eyebrow: string
  description: string
  color: number
  position: Vector3
  radius: number
  cta: string
  theme: ZoneTheme
  tags: string[]
  status?: string
}
