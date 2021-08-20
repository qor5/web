
import debounce from 'lodash/debounce';
import 'whatwg-fetch';
import Vue, { VueConstructor } from 'vue';

import {
	setPushState,
	EventData,
	setFormValue,
	jsonEvent,
} from './utils';

import {
	EventFuncID,
	EventResponse,
	PushState,
} from './types';

// Vue.config.productionTip = true;
declare var window: any;



export class Core {
	public debounce = debounce;

	private form: FormData;
	private rootChangeCurrent: any;
	private changeCurrent: any;


	constructor(form: FormData, rootChangeCurrent: any, changeCurrent: any) {
		this.form = form;
		this.rootChangeCurrent = rootChangeCurrent;
		this.changeCurrent = changeCurrent;
	}

	public loadPage(pushState: PushState, popstate?: boolean): Promise<EventResponse> {
		for (const key of this.form.keys()) {
			this.form.delete(key);
		}
		return this.fetchEventThenRefresh(
			{
				id: '__reload__',
				pushState,
			},
			{},
			popstate,
		);
	}

	public onpopstate(event: any) {
		if (!event.state) {
			// hashtag changes will trigger popstate, when this happen, event.state is null.
			return;
		}
		this.loadPage(event.state, true);
	}

	public fetchEvent(
		eventFuncId: EventFuncID,
		event: EventData,
		popstate?: boolean,
		pageURL?: string,
		vars?: any,
	): Promise<EventResponse> {
		const defaultURL = (window.location.pathname + window.location.search);

		const { newEventFuncId, eventURL } = setPushState(
			eventFuncId,
			pageURL || defaultURL,
			window.history,
			popstate,
		);

		const eventData = JSON.stringify({
			eventFuncId: newEventFuncId,
			event,
		});

		this.form.set('__event_data__', eventData);
		window.dispatchEvent(new Event('fetchStart'));
		return fetch(eventURL, {
			method: 'POST',
			body: this.form,
		}).finally(() => {
			window.dispatchEvent(new Event('fetchEnd'));
		}).then((r) => {
			return r.json();
		}).then((r: EventResponse) => {
				if (vars && r.varsScript) {
					(new Function("vars", r.varsScript))(vars);
				}
				// console.log("vars", vars, r.varsScript)
				return r;
		}).
		then((r: EventResponse) => {

			if (r.pageTitle) {
				document.title = r.pageTitle;
			}

			if (r.redirectURL) {
				document.location.replace(r.redirectURL);
			}

			if (r.pushState) {
				this.loadPage(r.pushState);
			}
			return r;
		});
	}

	public componentByTemplate(template: string): VueConstructor {
		return Vue.extend({
			provide: { core: this },
			inject: ['vars'],
			template: '<div>' + template + '</div>', // to make only one root.
			methods: this.newVueMethods(),
			mounted() {
				window.addEventListener('fetchStart', (e: Event) => {
					this.isFetching = true;
				});
				window.addEventListener('fetchEnd', (e: Event) => {
					this.isFetching = false;
				});
			},
			data() {
				return {
					isFetching: false,
				};
			},
		});
	}

	public setFormValue(fieldName: string, val: any) {
		setFormValue(this.form, fieldName, val);
	}

	// public getFormValue(fieldName: string): string {
	// 	return getFormValue(this.form, fieldName);
	// }

	// public getFormValueAsArray(fieldName: string): string[] {
	// 	return getFormValueAsArray(this.form, fieldName);
	// }

	private fetchEventThenRefresh(
		eventFuncId: EventFuncID,
		event: EventData,
		popstate?: boolean,
		pageURL?: string,
		vars?: any,
	): Promise<EventResponse> {
		return this.fetchEvent(eventFuncId, event, popstate, pageURL, vars)
			.then((r: EventResponse) => {
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
							portal.changeCurrent(this.componentByTemplate(pu.body));
						}
					}
					return r;
				}

				if (r.body && r.reload) {
					this.rootChangeCurrent(this.componentByTemplate(r.body));
					return r;
				}

				if (r.body) {
					this.changeCurrent(this.componentByTemplate(r.body));
					return r;
				}
				return r;
			})

	}

	private newVueMethods(): any {
		const self = this;
		return {
			loadPage(pushState: any, debouncedWait?: number): Promise<EventResponse> {
				let f = self.loadPage;
				if (debouncedWait) {
					f = debounce(this.loadPage, debouncedWait)
				}
				return f.apply(self, [pushState]);
			},
			triggerEventFunc(eventFuncId: EventFuncID,
							 evt: any,
							 pageURL?: string,
							 debouncedWait?: number,
							 fieldName?: string,
							 vars?: any,
			): Promise<EventResponse> {
				if (fieldName) {
					setFormValue(self.form, fieldName, evt)
				}
				let f = self.fetchEventThenRefresh;
				if (debouncedWait) {
					f = debounce(this.fetchEventThenRefresh, debouncedWait)
				}
				return f.apply(self, [eventFuncId, jsonEvent(evt), false, pageURL, vars]);
			},
			setFormValue(fieldName: string, val: any) {
				setFormValue(self.form, fieldName, val)
			}
		};
	}
}
