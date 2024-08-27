import { sleep } from './utils'

interface Payload {
  show: boolean
  value: number
  color: string
  height: number
}

export default class GlobalProgressBarControl {
  globalProgressBar: Payload

  constructor(globalProgressBar: Payload) {
    this.globalProgressBar = globalProgressBar
  }

  start(resource: RequestInfo | URL) {
    if (typeof resource !== 'string') return

    if (resource.indexOf('__execute_event__=__reload__') === -1) return

    this.globalProgressBar.show = true
    this.globalProgressBar.value = 20
  }

  async end(resource: RequestInfo | URL) {
    if (typeof resource !== 'string') return

    if (resource.indexOf('__execute_event__=__reload__') === -1) return

    this.globalProgressBar.value = 80

    await sleep(100)

    this.globalProgressBar.value = 100
    await sleep(150)

    // nextTick(() => {
    this.globalProgressBar.value = 0
    this.globalProgressBar.show = false
    // })
  }
}
