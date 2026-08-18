export class Input {
  private pressed = new Set<string>()

  constructor() {
    window.addEventListener('keydown', (event) => {
      this.pressed.add(event.code)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault()
      }
    })

    window.addEventListener('keyup', (event) => this.pressed.delete(event.code))
    window.addEventListener('blur', () => this.pressed.clear())
  }

  down(...codes: string[]) {
    return codes.some((code) => this.pressed.has(code))
  }
}
