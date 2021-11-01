import {
	EventFuncID,
	EventResponse,
	Location,
	Queries,
	QueryValue,
} from './types';
import {
	componentByTemplate,
	jsonEvent,
	setFormValue,
	setPushState
} from "@/utils";

import Vue from "vue";
declare var window: any;

export class Builder {
	_eventFuncID: EventFuncID = { id: "__reload__" };
	_url?: string;
	_event?: any;
	_vars?: any;
	_form?: FormData;
	_popstate?: boolean;
	_pushState?: boolean;
	_location?: Location;
	_vueContext?: Vue;

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

	public url(v: string): Builder {
		this._url = v;
		return this;
	}

	public event(v: any): Builder {
		this._event = v;
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

	public location(v: Location): Builder {
		this._location = v;
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
		if(!this._form) {
			return this;
		}
		for (const key of this._form.keys()) {
			this._form.delete(key);
		}
		return this;
	}

	public fieldValue(name: string, v: any): Builder {
		if(!this._form) {
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

	_setPushStateResult?: any

	public buildFetchURL(): string {
		this.ensurePushStateResult();
		return this._setPushStateResult.eventURL;
	}

	public buildPushStateArgs(): [data: any, title: string, url?: string | null] {
		this.ensurePushStateResult();
		return this._setPushStateResult.pushStateArgs;
	}

	public buildEventFuncID(): EventFuncID {
		this.ensurePushStateResult();
		return this._setPushStateResult.newEventFuncId;
	}

	private ensurePushStateResult() {
		if (this._setPushStateResult) {
			return
		}

		const defaultURL = window.location.href;

		this._setPushStateResult = setPushState({
			...this._eventFuncID,
			... { location: this._location}
		}, this._url || defaultURL)
	}

	public onpopstate(event: any): Promise<EventResponse> {
		if (!event.state) {
			// hashtag changes will trigger popstate, when this happen, event.state is null.
			return Promise.reject("event state is undefined");
		}
		return this.popstate(true).location(event.state).reload().go()
	}

	public go(): Promise<EventResponse> {
		if (this._eventFuncID.id == "__reload__") {
			this.formClear()
		}

		if (this._popstate !== true && this._pushState === true) {
			const args = this.buildPushStateArgs()
			if(args) {
				window.history.pushState(...args)
			}
		}

		const eventData = JSON.stringify({
			event: jsonEvent(this._event),
		});

		if(!this._form) {
			this._form = new FormData()
		}
		this._form.set('__event_data__', eventData);

		window.dispatchEvent(new Event('fetchStart'));
		return fetch(this.buildFetchURL(), {
			method: 'POST',
			body: this._form,
			redirect: 'follow',
		}).then((r) => {
			if(r.redirected) {
				document.location.replace(r.url);
				return {}
			}
			if (r.status >= 500) {
				alert(r.statusText)
				return {}
			}

			return r.json();
		}).then((r: EventResponse) => {
			if (this._vars && r.varsScript) {
				(new Function("vars", "$plaid", "$event", r.varsScript)).
					apply(this._vueContext,
					[this._vars, (this._vueContext as any).$plaid, null]);
			}
			return r;
		}).
		then((r: EventResponse) => {

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
				return r;
			}

			if (r.updatePortals && r.updatePortals.length > 0) {
				for (const pu of r.updatePortals) {
					const portal = window.__goplaid.portals[pu.name];
					if (portal) {
						portal.changeCurrent(componentByTemplate(pu.body));
					}
				}
				return r;
			}

			if (!this._vueContext) {
				throw new Error("vue context is undefined")
			}

			if (r.pushState) {
				return (this._vueContext as any).$plaid().reload().location(r.pushState).go();
			}

			if (r.body && r.reload) {
				(this._vueContext.$root as any).current = componentByTemplate(r.body);
				return r;
			}

			if (r.body) {
				(this._vueContext as any).current = componentByTemplate(r.body);
				return r;
			}
			return r;
		}).catch((error) => {
			alert("500 Internal Server Error")
			// document.location.reload();
			console.log(error)
		}).finally(() => {
			window.dispatchEvent(new Event('fetchEnd'));
		});
	}

}

export function plaid(): Builder {
	return new Builder();
}
