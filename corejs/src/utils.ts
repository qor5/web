import 'formdata-polyfill';
import querystring from 'query-string';
import union from 'lodash/union';
import without from 'lodash/without';

import {
	EventFuncID,
	ValueOp,
} from './types';
import Vue, {VueConstructor} from "vue";


export function setPushState(
	eventFuncId: EventFuncID,
	url: string,
): any {
	let pstate = eventFuncId.pushState;

	// If pushState is string, then replace query string to it
	// If pushState it object, merge url query
	if (typeof pstate === 'string') {
		// mergeQuery: false, so that filter remove filter item checkbox could clear the query item
		pstate = { query: querystring.parse(pstate, { arrayFormat: 'comma' }), mergeQuery: false };
	}

	let mergeURLQuery = false;
	if (pstate) {
		if (pstate.url) {
			url = pstate.url;
		}
		mergeURLQuery = pstate.mergeQuery || false;
	}

	const orig = querystring.parseUrl(url, { arrayFormat: 'comma', parseFragmentIdentifier: true });
	let query: any = {};

	let requestQuery = { __execute_event__: eventFuncId.id };
	if (mergeURLQuery) {
		query = { ...query, ...orig.query };
	}

	let serverPushState: any = null;
	let pushStateArgs;

	if (pstate) {
		const st = pstate.query || orig.query;

		let addressBarQuery = '';
		if (Object.keys(st).length > 0) {
			Object.keys(st).forEach((key) => {
				const v = st[key];
				if (Array.isArray(v)) {
					query[key] = v;
				} else if (typeof v === 'object') {
					const valueOp = v as ValueOp;
					queryUpdateByValueOp(query, key, valueOp);
				} else {
					query[key] = v;
				}
			});
			addressBarQuery = querystring.stringify(query, { arrayFormat: 'comma' });
			if (addressBarQuery.length > 0) {
				addressBarQuery = `?${addressBarQuery}`;
			}

			requestQuery = { ...requestQuery, ...query };
		}


		let newUrl = orig.url + addressBarQuery;
		if (orig.fragmentIdentifier) {
			newUrl = newUrl + "#" + orig.fragmentIdentifier
		}
		const pushedState = { query, url: newUrl };
		pushStateArgs = [pushedState, '', newUrl];

		serverPushState = {};
		Object.keys(query).forEach((key) => {
			const v = query[key];
			if (Array.isArray(v)) {
				serverPushState[key] = v;
			} else {
				serverPushState[key] = [`${v}`];
			}
		});
	}

	eventFuncId.pushState = serverPushState;

	return {
		pushStateArgs: pushStateArgs,
		newEventFuncId: eventFuncId,
		eventURL: `${orig.url}?${querystring.stringify(requestQuery, { arrayFormat: 'comma' })}`,
	};
}

function queryUpdateByValueOp(query: any, key: string, valueOp: ValueOp): void {
	if (!valueOp.value) {
		return;
	}

	let opValues: any = valueOp.value;
	if (!Array.isArray(valueOp.value)) {
		opValues = [valueOp.value];
	}

	let values = query[key];
	if (values && !Array.isArray(values)) {
		values = [values];
	}

	if (valueOp.add) {
		query[key] = union(values, opValues);
		return;
	}

	if (valueOp.remove) {
		const newValues = without(values, ...opValues);
		if (newValues.length === 0) {
			delete query[key];
		} else {
			query[key] = newValues;
		}
	}
	return;
}

export interface EventData {
	value?: string;
	checked?: boolean;
}

export function jsonEvent(evt: any) {
	const v: EventData = {};
	if (!evt) {
		return v;
	}

	if (evt.target) {
		// For Checkbox
		if (evt.target.checked) {
			v.checked = evt.target.checked;
		}

		// For Input
		if (evt.target.value !== undefined) {
			v.value = evt.target.value;
		}
		return v;
	}

	// For List
	if (evt.key) {
		v.value = evt.key;
		return v;
	}

	if (typeof evt === 'string' || typeof evt === 'number') {
		v.value = evt.toString(); // For Radio, Pager
	}

	return v;
}


export function setFormValue(form: FormData, fieldName: string, val: any) {
	if (!fieldName || fieldName.length === 0) {
		return;
	}

	if (val instanceof Event) {
		setFormValue(form, fieldName, val.target)
		return
	}

	if (val instanceof HTMLInputElement) {
		// console.log("target.value = ", target.value, ", target.type = ", target.type, ", target.checked = ", target.checked)
		if (val.files) {
			setFormValue(form, fieldName, val.files)
			return
		}

		switch (val.type) {
			case 'checkbox':
				if (val.checked) {
					form.set(fieldName, val.value)
				} else {
					form.delete(fieldName)
				}
				return
			case 'radio':
				if (val.checked) {
					form.set(fieldName, val.value)
				}
				return
			default:
				form.set(fieldName, val.value)
				return
		}
	}

	if (val instanceof HTMLTextAreaElement) {
		form.set(fieldName, val.value)
		return
	}

	form.delete(fieldName);
	if (!val) {
		return;
	}
	// console.log('val', val, 'Array.isArray(val)', Array.isArray(val));
	if (Array.isArray(val) || val instanceof FileList) {
		for (let i=0; i < val.length; i++) {
			if (val[i] instanceof File) {
				form.append(fieldName, val[i], val[i].name);
			} else {
				form.append(fieldName, val[i]);
			}
		}
		return;
	}

	if (val instanceof File) {
		form.set(fieldName, val, val.name);
	} else {
		form.set(fieldName, val);
	}
}

export function componentByTemplate(template: string): VueConstructor {
	return Vue.extend({
		inject: ['vars'],
		template: '<div>' + template + '</div>', // to make only one root.
		data: function () {
			return {
				locals: {},
			}
		}
	});
}
