import { Vector3 } from 'three'
import type { ZoneData } from '../types'

export const zones: ZoneData[] = [
  {
    id: 'hq',
    title: 'Glitch HQ',
    eyebrow: 'Home',
    description: 'The central hub for our studio, games, experiments, capabilities and culture.',
    color: 0x35d7ff,
    position: new Vector3(0, 0, 0),
    radius: 9,
    cta: 'Enter HQ',
    theme: { fog: 0x07101a, fogDensity: 0.010, ambient: 0x9cc8ff, accent: 0x35d7ff },
    tags: ['Studio', 'Games', 'Technology']
  },
  {
    id: 'puzzle-warrior',
    title: 'Puzzle Warrior',
    eyebrow: 'RPG • Match-3',
    description: 'A fantasy puzzle RPG where tactical matching, progression and character-driven adventure meet.',
    color: 0xe35cff,
    position: new Vector3(-30, 0, 22),
    radius: 10,
    cta: 'Explore Project',
    theme: { fog: 0x170c24, fogDensity: 0.015, ambient: 0xb26dff, accent: 0xe35cff },
    tags: ['Fantasy', 'RPG', 'Puzzle'],
    status: 'Playable'
  },
  {
    id: 'last-dehar',
    title: 'The Last Dehar',
    eyebrow: 'Psychological Horror',
    description: 'A first-person atmospheric horror experience set around the Kalash valleys, ritual, isolation and dread.',
    color: 0xa4e0ff,
    position: new Vector3(-28, 0, -28),
    radius: 11,
    cta: 'Enter the Valley',
    theme: { fog: 0x0b1820, fogDensity: 0.026, ambient: 0x7ca6bd, accent: 0xa4e0ff },
    tags: ['Horror', 'PC', 'Atmospheric'],
    status: 'In Development'
  },
  {
    id: 'water-valves',
    title: 'Water Valves',
    eyebrow: 'Puzzle • Casual',
    description: 'A bright plumbing puzzle world built around satisfying flow, tactile sorting and playful problem solving.',
    color: 0x18d9ff,
    position: new Vector3(4, 0, 34),
    radius: 9,
    cta: 'See Project',
    theme: { fog: 0x0b1a25, fogDensity: 0.011, ambient: 0x8fe8ff, accent: 0x18d9ff },
    tags: ['Casual', 'Mobile', 'Puzzle'],
    status: 'Live'
  },
  {
    id: 'pirates-attack',
    title: 'Pirates Attack',
    eyebrow: 'Action • Arcade',
    description: 'Protect your ship, defend your treasure and survive fast arcade encounters in a stylized pirate world.',
    color: 0xffad39,
    position: new Vector3(32, 0, 22),
    radius: 10,
    cta: 'Board Project',
    theme: { fog: 0x0c1620, fogDensity: 0.013, ambient: 0xffc47d, accent: 0xffad39 },
    tags: ['Arcade', 'Action', 'Mobile'],
    status: 'Live'
  },
  {
    id: 'careers',
    title: 'Career Terminal',
    eyebrow: 'Join the Party',
    description: 'Meet the team, see open roles and help build the next Glitch world.',
    color: 0xff4f86,
    position: new Vector3(30, 0, -18),
    radius: 9,
    cta: 'View Careers',
    theme: { fog: 0x140912, fogDensity: 0.013, ambient: 0xff8ab1, accent: 0xff4f86 },
    tags: ['Careers', 'Team', 'Culture']
  },
  {
    id: 'contact',
    title: 'Signal Tower',
    eyebrow: 'Contact',
    description: 'Publishing, investment, partnerships, services or game development — send us a signal.',
    color: 0xff5555,
    position: new Vector3(4, 0, -40),
    radius: 10,
    cta: 'Open Contact',
    theme: { fog: 0x140b0b, fogDensity: 0.018, ambient: 0xff8a8a, accent: 0xff5555 },
    tags: ['Business', 'Publishing', 'Contact']
  },
  {
    id: 'lab',
    title: 'Experiment Lab',
    eyebrow: 'R&D',
    description: 'Prototype mechanics, unreleased experiments, technical tests and ideas currently in development.',
    color: 0x8f56ff,
    position: new Vector3(0, 0, 52),
    radius: 9,
    cta: 'Enter Lab',
    theme: { fog: 0x110c1d, fogDensity: 0.020, ambient: 0xaa8cff, accent: 0x8f56ff },
    tags: ['Prototype', 'R&D', 'Future']
  }
]
