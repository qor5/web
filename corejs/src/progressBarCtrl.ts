import { sleep } from './utils'

interface progressBarPayload {
  show: boolean
  value: number
}

interface payload {
  progressBarObj: progressBarPayload
  fetchParamMatchList: string[]
}

interface ctrlPayload {
  resource?: RequestInfo | URL
}

export default class GlobalProgressBarControl {
  private progressBarObj: progressBarPayload
  private fetchParamMatchList: string[]
  private maxStackCount: number
  private curStackCount: number
  private defaultProgress: number

  constructor({ progressBarObj, fetchParamMatchList }: payload) {
    this.progressBarObj = progressBarObj
    // this.fetchParamMatchList = ['*'] // match all request
    this.fetchParamMatchList = fetchParamMatchList
    this.maxStackCount = 0
    this.curStackCount = 0
    this.defaultProgress = 20
  }

  /**
   * increment the progress (denominator) with each call
   *  */
  public start({ resource }: ctrlPayload = {}) {
    if (!this.isMatchedKeyword(resource)) return
    this.maxStackCount++
    this.curStackCount++

    this.progressBarObj.show = true
    this.progressBarObj.value = this.defaultProgress
  }

  /**
   * reduce the progress (denominator) with each call
   *  */
  public end({ resource }: ctrlPayload = {}) {
    if (!this.isMatchedKeyword(resource)) return

    if (this.curStackCount === 0) return

    this.curStackCount--

    this.increaseProgress()
  }

  /**
   * set the progress to 100% immediately (include animation effect)
   */
  public complete() {
    this.curStackCount = 0
    this.increaseProgress()
  }

  /**
   * set the progress to 0% immediately (include animation effect)
   */
  public reset() {
    this.progressBarObj.value = 0
    this.curStackCount = 0
    this.maxStackCount = 0
  }

  /**
   * set hide progressBar and set all progress to 0
   */
  public hideAndReset() {
    this.progressBarObj.show = false
    this.reset()
  }

  protected async increaseProgress() {
    if (this.curStackCount > 0) {
      this.progressBarObj.value =
        Number((((this.maxStackCount - this.curStackCount) / this.maxStackCount) * 80).toFixed(2)) +
        this.defaultProgress
    }
    // all loaded
    else {
      this.progressBarObj.value = 100
      await sleep(150)
      this.progressBarObj.value = 0
      this.progressBarObj.show = false
      this.maxStackCount = 0
    }
  }

  protected isMatchedKeyword(resource?: URL | RequestInfo): boolean {
    if (resource === undefined) return true

    if (typeof resource !== 'string') return false

    if (this.fetchParamMatchList[0] === '*') return true

    return this.fetchParamMatchList.some((keyword) => resource.indexOf(keyword) > -1)
  }
}
