import querystring from 'query-string'

export interface ValueOp {
  value: string | string[]
  add?: boolean
  remove?: boolean
}

export type QueryValue = null | undefined | string | string[] | ValueOp | Function

export interface Queries {
  [key: string]: QueryValue
}

// This could be used by server side with: r.PushState = web.Location(url.Values{})
export interface Location {
  mergeQuery?: boolean
  url?: string
  stringQuery?: string
  query?: Queries
  clearMergeQueryKeys?: string[]
  stringifyOptions?: querystring.StringifyOptions
}

export interface EventFuncID {
  id: string
  location?: Location
}

export interface PortalUpdate {
  name: string
  body: string
  afterLoaded?: string
}

export interface EventResponse {
  states?: any
  body?: any
  data?: any
  redirectURL?: string
  pageTitle?: string
  pushState?: Location
  reload?: boolean
  reloadPortals?: string[]
  updatePortals?: PortalUpdate[]
  runScript?: string
}
