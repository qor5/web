import { parsePathAndQuery, generateUniqueId } from '@/utils'

export interface HistoryRecord {
  state: any
  unused: string
  url?: string | URL | null
}

const debug = false

export class HistoryManager {
  private static instance: HistoryManager | null = null

  private _stack: HistoryRecord[] = []
  private _currentIndex = -1

  private originalPushState: typeof window.history.pushState
  private originalReplaceState: typeof window.history.replaceState

  private constructor() {
    this.originalPushState = window.history.pushState.bind(window.history)
    this.originalReplaceState = window.history.replaceState.bind(window.history)
    window.history.pushState = this.pushState.bind(this)
    window.history.replaceState = this.replaceState.bind(this)
    window.addEventListener('popstate', this.onPopState.bind(this))

    this._stack.push({
      state: null,
      unused: '',
      url: parsePathAndQuery(window.location.href)
    })
    this._currentIndex = 0
    if (debug) {
      console.log('init', this._stack, this._currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }
  }

  public static getInstance(): HistoryManager {
    if (!HistoryManager.instance) {
      HistoryManager.instance = new HistoryManager()
    }
    return HistoryManager.instance
  }

  private pushState(state: any, unused: string, url?: string | URL | null): void {
    if (!state) {
      state = {}
    }
    state.__uniqueId = generateUniqueId()

    this._stack = this._stack.slice(0, this._currentIndex + 1)
    this._stack.push({ state: state, unused: unused, url: url })
    this._currentIndex++

    if (debug) {
      console.log('pushState', this._stack, this._currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }

    this.originalPushState(state, unused, url)
  }

  private replaceState(state: any, unused: string, url?: string | URL | null): void {
    if (this._currentIndex >= 0) {
      if (!state) {
        state = {}
      }
      state.__uniqueId = generateUniqueId()

      this._stack[this._currentIndex] = { state: state, unused: unused, url: url }
      if (debug) {
        console.log('replaceState', this._stack, this._currentIndex)
        console.log('currentState', this.current())
        console.log('lastState', this.last())
      }
    } else {
      throw new Error(
        'Invalid state index for replaceState ' +
          JSON.stringify(state) +
          ' stack:' +
          JSON.stringify(this._stack)
      )
    }
    this.originalReplaceState(state, unused, url)
  }

  private onPopState(event: PopStateEvent): void {
    const index = this._stack.findIndex(
      (v) =>
        (!event.state && !v.state) ||
        (v.state && event.state && v.state.__uniqueId === event.state.__uniqueId)
    )
    let behavior = ''
    if (index < this._currentIndex) {
      behavior = 'Back'
    } else if (index > this._currentIndex) {
      behavior = 'Forward'
    }
    if (index === -1) {
      throw new Error(
        'Invalid state index for popstate ' +
          JSON.stringify(event.state) +
          ' stack:' +
          JSON.stringify(this._stack)
      )
    }
    this._currentIndex = index

    if (debug) {
      console.log('popstate', event.state)
      console.log('onPopState', behavior, this._stack, this._currentIndex)
      console.log('currentState', this.current())
      console.log('lastState', this.last())
    }
  }

  public stack(): HistoryRecord[] {
    return this._stack
  }

  public currentIndex(): number {
    return this._currentIndex
  }

  public current(): HistoryRecord {
    return this._stack[this._currentIndex]
  }

  public last(): HistoryRecord | null {
    if (this._currentIndex === 0) {
      return null
    }
    return this._stack[this._currentIndex - 1]
  }
}
