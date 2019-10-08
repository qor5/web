
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

	private debounceFetchEventThenRefresh = debounce(this.fetchEventThenRefresh, 800);
	private form: FormData;
	private rootChangeCurrent: any;
	private changeCurrent: any;


	constructor(form: FormData, rootChangeCurrent: any, changeCurrent: any) {
		this.form = form;
		this.rootChangeCurrent = rootChangeCurrent;
		this.changeCurrent = changeCurrent;
	}

	public loadPage(pushState: PushState, popstate?: boolean) {
		for (const key of this.form.keys()) {
			this.form.delete(key);
		}
		this.fetchEventThenRefresh(
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

	public componentByTemplate(template: string, afterLoaded?: any): VueConstructor {
		return Vue.extend({
			provide: { core: this },
			template: '<div>' + template + '</div>', // to make only one root.
			methods: this.newVueMethods(),
			mounted() {
				this.$nextTick(() => {
					if (afterLoaded) {
						afterLoaded(this);
					}
				});
				window.addEventListener('fetchStart', (e: Event) => {
					this.isFetching = true;
				});
				window.addEventListener('fetchEnd', (e: Event) => {
					this.isFetching = false;
				});
			},
			data() {
				return {
					vars: {},
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
	) {
		this.fetchEvent(eventFuncId, event, popstate, pageURL)
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
							let afterLoaded;
							if (pu.afterLoaded) {
								afterLoaded = new Function('comp', pu.afterLoaded);
							}
							portal.changeCurrent(this.componentByTemplate(pu.body, afterLoaded));
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
			});
	}

	private newVueMethods(): any {
		const self = this;
		return {
			topage(pushState: any) {
				self.loadPage(pushState);
			},
			triggerEventFunc(eventFuncId: EventFuncID, evt: any, pageURL?: string) {
				self.fetchEventThenRefresh(eventFuncId, jsonEvent(evt), false, pageURL);
			},
			oninput(eventFuncId?: EventFuncID, fieldName?: string, evt?: any) {
				self.controlsOnInput(eventFuncId, fieldName, evt);
			},
		};
	}

	private controlsOnInput(
		eventFuncId?: EventFuncID,
		fieldName?: string,
		evt?: any,
	) {
		if (fieldName) {
			if (evt.target.files) {
				this.form.delete(fieldName);
				for (const f of evt.target.files) {
					this.form.append(fieldName, f, f.name);
				}
			} else if (evt.target.type === 'checkbox') {
				if (evt.target.checked) {
					this.form.set(fieldName, evt.target.value);
				} else {
					this.form.delete(fieldName);
				}
			} else {
				this.form.set(fieldName, evt.target.value);
			}
		}
		if (eventFuncId) {
			this.debounceFetchEventThenRefresh(eventFuncId, jsonEvent(evt));
		}
	}

}
