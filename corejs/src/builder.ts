import {EventFuncID, EventResponse, Location, Queries, QueryValue,} from './types';
import {buildPushState, componentByTemplate, setFormValue} from "@/utils";

import Vue from "vue";

declare var window: any;

export class Builder {
	_eventFuncID: EventFuncID = {id: "__reload__"};
	_url?: string;
	_method?: string;
	_vars?: any;
	_form?: FormData;
	_popstate?: boolean;
	_pushState?: boolean;
	_location?: Location;
	_vueContext?: Vue;
	_buildPushStateResult?: any

	public eventFunc(id: string): Builder {
		this._eventFuncID.id = id;
		return this;
	}

	public eventFuncID(v: EventFuncID): Builder {
		this._eventFuncID = v
		return this;
	}

	public reload(): Builder {
		this._eventFuncID.id = "__reload__"
		return this;
	}

	// if you call url(), it will post event func to this url, or else it will post to current window url
	public url(v: string): Builder {
		this._url = v;
		return this;
	}

	public vars(v: any): Builder {
		this._vars = v;
		return this;
	}

	public query(key: string, val: QueryValue): Builder {
		if (!this._location) {
			this._location = {}
		}
		if (!this._location.query) {
			this._location.query = {};
		}
		this._location.query[key] = val;
		return this;
	}

	public mergeQuery(v: boolean): Builder {
		if (!this._location) {
			this._location = {}
		}
		this._location.mergeQuery = v
		return this;
	}

	public clearMergeQuery(clearKeys: string[]): Builder {
		if (!this._location) {
			this._location = {}
		}
		this._location.mergeQuery = true
		this._location.clearMergeQueryKeys = clearKeys
		return this;
	}

	public location(v: Location): Builder {
		this._location = v;
		return this;
	}

	public stringQuery(v: string): Builder {
		if (!this._location) {
			this._location = {}
		}

		this._location.stringQuery = v;
		return this;
	}

	public pushState(v: boolean): Builder {
		this._pushState = v;
		return this;
	}

	public queries(v: Queries): Builder {
		if (!this._location) {
			this._location = {}
		}
		this._location.query = v;
		return this;
	}

	public pushStateURL(v: string): Builder {
		if (!this._location) {
			this._location = {}
		}
		this._location.url = v;
		this.pushState(true);
		return this;
	}

	public form(v: FormData): Builder {
		this._form = v;
		return this;
	}

	public vueContext(v: Vue): Builder {
		this._vueContext = v;
		return this;
	}

	public formClear(): Builder {
		if (!this._form) {
			return this;
		}
		for (const key of this._form.keys()) {
			this._form.delete(key);
		}
		return this;
	}

	public fieldValue(name: string, v: any): Builder {
		if (!this._form) {
			throw new Error("form not exist")
		}
		setFormValue(this._form, name, v)
		return this;
	}

	public popstate(v: boolean): Builder {
		this._popstate = v;
		return this;
	}

	public run(script: string): Builder {
		const f = new Function(script)
		f.apply(this._vueContext)
		return this;
	}

	public method(m: string): Builder {
		this._method = m;
		return this;
	}

	public buildFetchURL(): string {
		this.ensurePushStateResult();
		return this._buildPushStateResult.eventURL;
	}

	public buildPushStateArgs(): [data: any, title: string, url?: string | null] {
		this.ensurePushStateResult();
		return this._buildPushStateResult.pushStateArgs;
	}

	public onpopstate(event: any): Promise<EventResponse> {
		if (!event.state) {
			// hashtag changes will trigger popstate, when this happen, event.state is null.
			return Promise.reject("event state is undefined");
		}
		return this.popstate(true).location(event.state).reload().go()
	}

	public runPushState() {
		if (this._popstate !== true && this._pushState === true) {
			if (window.history.length <= 2) {
				window.history.pushState({url: window.location.href}, "", window.location.href)
			}
			const args = this.buildPushStateArgs()
			if (args) {
				window.history.pushState(...args)
			}
		}
	}

	public go(): Promise<EventResponse> {
		if (this._eventFuncID.id == "__reload__") {
			this.formClear()
		}

		this.runPushState()

		let fetchOpts: RequestInit = {
			method: 'POST',
			redirect: 'follow',
		}

		if (this._method) {
			fetchOpts.method = this._method
		}

		if (fetchOpts.method === 'POST') {
			if (!this._form) {
				this._form = new FormData()
			}
			fetchOpts.body = this._form
		}

		window.dispatchEvent(new Event('fetchStart'));
		return fetch(this.buildFetchURL(), fetchOpts).then((r) => {
			if (r.redirected) {
				document.location.replace(r.url);
				return {}
			}
			if (r.status >= 500) {
				alert(r.statusText)
				return {}
			}

			(this._form as any).dirty = false
			return r.json();
		}).then((r: EventResponse) => {
			if (this._vars && r.varsScript) {
				(new Function("vars", "$plaid", "$event", "plaidForm", r.varsScript)).apply(
					this._vueContext,
					[this._vars, (this._vueContext as any).$plaid, null, this._form]);
			}
			return r;
		}).then((r: EventResponse) => {

			if (r.pageTitle) {
				document.title = r.pageTitle;
			}

			if (r.redirectURL) {
				document.location.replace(r.redirectURL);
			}

			if (r.reloadPortals && r.reloadPortals.length > 0) {
				for (const portalName of r.reloadPortals) {
					const portal = window.__goplaid.portals[portalName];
					if (portal) {
						portal.reload();
					}
				}
			}

			if (r.updatePortals && r.updatePortals.length > 0) {
				for (const pu of r.updatePortals) {
					const portal = window.__goplaid.portals[pu.name];
					if (portal) {
						portal.changeCurrentTemplate(pu.body);
					}
				}
			}

			if (!this._vueContext) {
				throw new Error("vue context is undefined")
			}

			if (r.pushState) {
				return (this._vueContext as any).$plaid()
					.reload()
					.pushState(true)
					.location(r.pushState)
					.go();
			}

			if (r.body && r.reload) {
				(this._vueContext.$root as any).current = componentByTemplate(r.body, this._form);
				return r;
			}

			if (r.body) {
				(this._vueContext as any).current = componentByTemplate(r.body, this._form);
				return r;
			}
			return r;
		}).catch((error) => {
			console.log(error)
			alert("500 Internal Server Error")
			// document.location.reload();
		}).finally(() => {
			window.dispatchEvent(new Event('fetchEnd'));
		});
	}

	private ensurePushStateResult() {
		if (this._buildPushStateResult) {
			return
		}

		const defaultURL = window.location.href;

		this._buildPushStateResult = buildPushState({
			...this._eventFuncID,
			...{location: this._location}
		}, this._url || defaultURL)
	}

}

export function plaid(): Builder {
	return new Builder();
}
