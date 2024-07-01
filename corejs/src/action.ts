import {type Builder, plaid} from "@/builder";

export class ActionBuilder {
  _compoType?: string
  _compoState?: any
  _injector?: string
  _syncQuery?: boolean
  _method?: string
  _request?: any
  _queryTags?: any
  _plaidBuilder?: Builder

  public compoType(v: string): ActionBuilder {
    this._compoType = v
    return this
  }

  public compoState(v: any): ActionBuilder {
    this._compoState = v
    return this
  }

  public injector(v: string): ActionBuilder {
    this._injector = v
    return this
  }

  public syncQuery(v: boolean): ActionBuilder {
    this._syncQuery = v
    return this
  }

  public method(v: string): ActionBuilder {
    this._method = v
    return this
  }

  public request(v: any): ActionBuilder {
    this._request = v
    return this
  }

  public queryTags(v: any): ActionBuilder {
    this._queryTags = v
    return this
  }

  public encodeQuery(): string {
    return ""
  }

  public buildAction(): string {
    return ""
  }

  public go() {
    plaid().eventFunc("__dispatch_stateful_action__").
      stringQuery(this.encodeQuery()).
      pushState((b: ActionBuilder) => b._syncQuery).
      fieldValue("__action__", this.buildAction())
  }
}

export function action(factory: (input: ActionBuilder) => void): () => ActionBuilder {
  return (): ActionBuilder => {
    const n = new ActionBuilder()
    factory(n)
    return n
  }
}
