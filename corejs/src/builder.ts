import type { EventFuncID, EventResponse, Location, Queries, QueryValue } from './types'
import { buildPushState, objectToFormData, setFormValue } from '@/utils'

declare let window: any

export class Builder {
  _eventFuncID: EventFuncID = { id: '__reload__' }
  _url?: string
  _method?: string
  _vars?: any
  _locals?: any
  _loadPortalBody: boolean = false
  _form?: any = {}
  _popstate?: boolean
  _pushState?: boolean
  _location?: Location
  _updateRootTemplate?: any
  _buildPushStateResult?: any

  readonly ignoreErrors = [
    'Failed to fetch', // Chrome
    'NetworkError when attempting to fetch resource.', // Firefox
    'The Internet connection appears to be offline.', // Safari
    'Network request failed' // `cross-fetch`
  ]

  isIgnoreError = (err: any) => {
    if (err instanceof Error) {
      return this.ignoreErrors?.includes(err.message)
    }
    return false
  }

  public eventFunc(id: string): Builder {
    this._eventFuncID.id = id
    return this
  }

  public updateRootTemplate(v: any): Builder {
    this._updateRootTemplate = v
    return this
  }

  public eventFuncID(v: EventFuncID): Builder {
    this._eventFuncID = v
    return this
  }

  public reload(): Builder {
    this._eventFuncID.id = '__reload__'
    return this
  }

  // if you call url(), it will post event func to this url, or else it will post to current window url
  public url(v: string): Builder {
    this._url = v
    return this
  }

  public vars(v: any): Builder {
    this._vars = v
    return this
  }

  public loadPortalBody(v: boolean): Builder {
    this._loadPortalBody = v
    return this
  }

  public locals(v: any): Builder {
    // console.log("locals", v)
    this._locals = v
    return this
  }

  public query(key: string, val: QueryValue): Builder {
    if (!this._location) {
      this._location = {}
    }
    if (!this._location.query) {
      this._location.query = {}
    }
    this._location.query[key] = val
    return this
  }

  public mergeQuery(v: boolean): Builder {
    if (!this._location) {
      this._location = {}
    }
    this._location.mergeQuery = v
    return this
  }

  public clearMergeQuery(clearKeys: string[]): Builder {
    if (!this._location) {
      this._location = {}
    }
    this._location.mergeQuery = true
    this._location.clearMergeQueryKeys = clearKeys
    return this
  }

  public location(v: Location): Builder {
    this._location = v
    return this
  }

  public stringQuery(v: string): Builder {
    if (!this._location) {
      this._location = {}
    }

    this._location.stringQuery = v
    return this
  }

  public pushState(v: boolean): Builder {
    this._pushState = v
    return this
  }

  public queries(v: Queries): Builder {
    if (!this._location) {
      this._location = {}
    }
    this._location.query = v
    return this
  }

  public pushStateURL(v: string): Builder {
    if (!this._location) {
      this._location = {}
    }
    this._location.url = v
    this.pushState(true)
    return this
  }

  public form(v: any): Builder {
    this._form = v
    return this
  }

  public fieldValue(name: string, v: any): Builder {
    if (!this._form) {
      throw new Error('form not exist')
    }
    this._form[name] = v
    return this
  }

  public popstate(v: boolean): Builder {
    this._popstate = v
    return this
  }

  public run(script: string): Builder {
    const f = new Function(script)
    f.apply(this)
    return this
  }

  public method(m: string): Builder {
    this._method = m
    return this
  }

  public buildFetchURL(): string {
    this.ensurePushStateResult()
    return this._buildPushStateResult.eventURL
  }

  public buildPushStateArgs(): [data: any, title: string, url?: string | null] {
    this.ensurePushStateResult()
    return this._buildPushStateResult.pushStateArgs
  }

  public onpopstate(event: any): Promise<void | EventResponse> {
    if (!event.state) {
      // hashtag changes will trigger popstate, when this happens, event.state is null.
      return Promise.reject('event state is undefined')
    }
    return this.popstate(true).location(event.state).reload().go()
  }

  public runPushState() {
    if (this._popstate !== true && this._pushState === true) {
      if (window.history.length <= 2) {
        window.history.pushState({ url: window.location.href }, '', window.location.href)
      }
      const args = this.buildPushStateArgs()
      if (args) {
        window.history.pushState(...args)
      }
    }
  }

  public go(): Promise<void | EventResponse> {
    if (this._eventFuncID.id == '__reload__') {
      this._buildPushStateResult = null
    }

    this.runPushState()

    const fetchOpts: RequestInit = {
      method: 'POST',
      redirect: 'follow'
    }

    if (this._method) {
      fetchOpts.method = this._method
    }

    if (fetchOpts.method === 'POST') {
      const formData = new FormData()
      objectToFormData(this._form, formData)
      fetchOpts.body = formData
    }

    window.dispatchEvent(new Event('fetchStart'))
    const fetchURL = this.buildFetchURL()
    return fetch(fetchURL, fetchOpts)
      .then((r) => {
        if (r.redirected) {
          document.location.replace(r.url)
          return {}
        }

        return r.json()
      })
      .then((r: EventResponse) => {
        if (r.runScript) {
          new Function('vars', 'locals', 'form', 'plaid', r.runScript).apply(this, [
            this._vars,
            this._locals,
            this._form,
            (): Builder => {
              return plaid()
                .vars(this._vars)
                .locals(this._locals)
                .form(this._form)
                .updateRootTemplate(this._updateRootTemplate)
            }
          ])
        }
        return r
      })
      .then((r: EventResponse) => {
        if (r.pageTitle) {
          document.title = r.pageTitle
        }

        if (r.redirectURL) {
          document.location.replace(r.redirectURL)
        }

        if (r.reloadPortals && r.reloadPortals.length > 0) {
          for (const portalName of r.reloadPortals) {
            const portal = window.__goplaid.portals[portalName]
            if (portal) {
              portal.reload()
            }
          }
        }

        if (r.updatePortals && r.updatePortals.length > 0) {
          for (const pu of r.updatePortals) {
            const { updatePortalTemplate } = window.__goplaid.portals[pu.name]
            if (updatePortalTemplate) {
              updatePortalTemplate(pu.body)
            }
          }
        }

        if (r.pushState) {
          return plaid()
            .updateRootTemplate(this._updateRootTemplate)
            .reload()
            .pushState(true)
            .location(r.pushState)
            .go()
        }

        if (this._loadPortalBody && r.body) {
          return r
        }

        if (r.body) {
          this._updateRootTemplate(r.body)
          return r
        }

        return r
      })
      .catch((error) => {
        console.log(error)
        if (!this.isIgnoreError(error)) {
          alert('Unknown Error')
        }
        // document.location.reload();
      })
      .finally(() => {
        window.dispatchEvent(new Event('fetchEnd'))
      })
  }

  private ensurePushStateResult() {
    if (this._buildPushStateResult) {
      return
    }

    const defaultURL = window.location.href

    this._buildPushStateResult = buildPushState(
      {
        ...this._eventFuncID,
        ...{ location: this._location }
      },
      this._url || defaultURL
    )
  }
}

export function plaid(): Builder {
  return new Builder()
}
