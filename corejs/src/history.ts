import { parsePathAndQuery } from '@/utils'

export interface HistoryRecord {
  state: any
  unused: string
  url?: string | URL | null
}

const debug = false

export class HistoryManager {
  private stack: HistoryRecord[] = []
  private currentIndex = -1

  private originalPushState: typeof window.history.pushState
  private originalReplaceState: typeof window.history.replaceState

  constructor() {
    this.originalPushState = window.history.pushState.bind(window.history)
    this.originalReplaceState = window.history.replaceState.bind(window.history)
    window.history.pushState = this.pushState.bind(this)
    window.history.replaceState = this.replaceState.bind(this)
    window.addEventListener('popstate', this.onPopState.bind(this))

    this.stack.push({
      state: null,
      unused: '',
      url: parsePathAndQuery(window.location.href)
    })
    this.currentIndex = 0
    if (debug) {
      console.log('init', this.stack, this.currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }
  }

  private pushState(state: any, unused: string, url?: string | URL | null): void {
    if (!state) {
      state = {}
    }
    state.__uniqueId = Math.random().toString(36).substr(2, 9)

    this.stack = this.stack.slice(0, this.currentIndex + 1)
    this.stack.push({ state: state, unused: unused, url: url })
    this.currentIndex++

    if (debug) {
      console.log('pushState', this.stack, this.currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }

    this.originalPushState(state, unused, url)
  }

  private replaceState(state: any, unused: string, url?: string | URL | null): void {
    if (this.currentIndex >= 0) {
      if (!state) {
        state = {}
      }
      state.__uniqueId = Math.random().toString(36).substr(2, 9)

      this.stack[this.currentIndex] = { state: state, unused: unused, url: url }
      if (debug) {
        console.log('replaceState', this.stack, this.currentIndex)
        console.log('currentState', this.current())
        console.log('lastState', this.last())
      }
    } else {
      throw new Error('Invalid state index')
    }
    this.originalReplaceState(state, unused, url)
  }

  private onPopState(event: PopStateEvent): void {
    const index = this.stack.findIndex(
      (v) =>
        (!event.state && !v.state) ||
        (v.state && event.state && v.state.__uniqueId === event.state.__uniqueId)
    )
    let behavior = ''
    if (index < this.currentIndex) {
      behavior = 'Back'
    } else if (index > this.currentIndex) {
      behavior = 'Forward'
    }
    if (index === -1) {
      throw new Error('Invalid state index')
    }
    this.currentIndex = index

    if (debug) {
      console.log('popstate', event.state)
      console.log('onPopState', behavior, this.stack, this.currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }
  }

  public current(): HistoryRecord {
    return this.stack[this.currentIndex]
  }

  public last(): HistoryRecord | null {
    if (this.currentIndex === 0) {
      return null
    }
    return this.stack[this.currentIndex - 1]
  }
}
