import 'formdata-polyfill';
import querystring from 'query-string';
import union from 'lodash/union';
import without from 'lodash/without';

import {
	EventFuncID,
	StatePusher,
	ValueOp,
} from './types';


export function newFormWithStates(states: any): FormData {
	const f = new FormData();
	if (!states) {
		return f;
	}
	mergeStatesIntoForm(f, states);
	return f;
}

export function mergeStatesIntoForm(form: FormData, states: any) {
	if (!states) {
		return;
	}
	for (const k of Object.keys(states)) {
		form.delete(k);
		for (const v of states[k]) {
			form.append(k, v);
		}
	}
}

export function setPushState(
	eventFuncId: EventFuncID,
	url: string,
	pusher: StatePusher,
	popstate: boolean | undefined,
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

	const orig = querystring.parseUrl(url, { arrayFormat: 'comma' });
	let query: any = {};

	let requestQuery = { __execute_event__: eventFuncId.id };
	if (mergeURLQuery) {
		query = { ...query, ...orig.query };
	}

	let serverPushState: any = null;
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

		if (popstate !== true) {
			const newUrl = orig.url + addressBarQuery;
			const pushedState = { query, url: newUrl };
			pusher.pushState(
				pushedState,
				'',
				newUrl,
			);
		}

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

	if (evt && evt.target) {
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
	form.delete(fieldName);
	if (!val) {
		return;
	}
	// console.log('val', val, 'Array.isArray(val)', Array.isArray(val));
	if (Array.isArray(val)) {
		val.forEach((v) => {
			form.append(fieldName, v);
		});
		return;
	}
	form.set(fieldName, val);
}

// export function getFormValue(form: FormData, fieldName: string): string {
// 	const val = form.get(fieldName);
// 	if (typeof val === 'string') {
// 		return val;
// 	}
// 	return '';
// }

// export function getFormValueAsArray(form: FormData, fieldName: string): string[] {
// 	const vals = form.getAll(fieldName);
// 	const r: string[] = [];
// 	for (const v of vals) {
// 		if (typeof v === 'string') {
// 			r.push(v);
// 		}
// 	}
// 	return r;
// }
