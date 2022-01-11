import 'formdata-polyfill';
import querystring from 'query-string';
import union from 'lodash/union';
import without from 'lodash/without';
import {EventFuncID, ValueOp,} from './types';
import Vue, {VueConstructor} from "vue";


export function setPushState(
	eventFuncId: EventFuncID,
	url: string,
): any {
	let pstate = eventFuncId.location;

	// If pushState is string, then replace query string to it
	// If pushState it object, merge url query
	if (typeof pstate === 'string') {
		// mergeQuery: false, so that filter remove filter item checkbox could clear the query item
		pstate = {
			query: querystring.parse(pstate, {arrayFormat: 'comma'}),
			mergeQuery: false
		};
	}

	let mergeURLQuery = false;
	let excludeParams: string[] = [];
	if (pstate) {
		if (pstate.url) {
			url = pstate.url;
		}
		mergeURLQuery = pstate.mergeQuery || false;
		excludeParams = pstate.mergeQueryWithoutParams || [];
	}

	const orig = querystring.parseUrl(url, {
		arrayFormat: 'comma',
		parseFragmentIdentifier: true
	});
	let query: any = {};

	let requestQuery = {__execute_event__: eventFuncId.id};
	if (mergeURLQuery) {
		for (const [key, value] of Object.entries(orig.query)) {
			// If excludeParams is present then skip current location queries which contained by excludeParams
			// If excludeParams is empty, all queries from current location will be kept
			if (excludeParams.indexOf(key) < 0) {
				query[key] = value
			}
		}
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
			addressBarQuery = querystring.stringify(query, {arrayFormat: 'comma'});
			if (addressBarQuery.length > 0) {
				addressBarQuery = `?${addressBarQuery}`;
			}

			requestQuery = {...requestQuery, ...query};
		}


		let newUrl = orig.url + addressBarQuery;
		if (orig.fragmentIdentifier) {
			newUrl = newUrl + "#" + orig.fragmentIdentifier
		}
		const pushedState = {query, url: newUrl};
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

	eventFuncId.location = serverPushState;

	return {
		pushStateArgs: pushStateArgs,
		newEventFuncId: eventFuncId,
		eventURL: `${orig.url}?${querystring.stringify(requestQuery, {arrayFormat: 'comma'})}`,
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

export function inspectFormData(form: FormData) {
	let r: any = {}
	for (const pair of form.entries()) {
		r[pair[0].toString()] = pair[1]
	}
	return r
}

export function setFormValue(form: FormData, fieldName: string, val: any): boolean {
	// console.log("setFormValue", inspectFormData(form), fieldName, val)
	if (!fieldName || fieldName.length === 0) {
		return false;
	}

	if (val instanceof Event) {
		return setFormValue(form, fieldName, val.target)
	}

	if (val instanceof HTMLInputElement) {
		// console.log("target.value = ", target.value, ", target.type = ", target.type, ", target.checked = ", target.checked)
		if (val.files) {
			return setFormValue(form, fieldName, val.files)
		}

		switch (val.type) {
			case 'checkbox':
				if (val.checked) {
					return formSet(form, fieldName, val.value)
				} else {
					if (form.has(fieldName)) {
						form.delete(fieldName)
						return true
					}
				}
				return false
			case 'radio':
				if (val.checked) {
					return formSet(form, fieldName, val.value)
				}
				return false
			default:
				return formSet(form, fieldName, val.value)
		}
	}

	if (val instanceof HTMLTextAreaElement) {
		return formSet(form, fieldName, val.value)
	}

	if (val === null || val === undefined) {
		return formSet(form, fieldName, "")
	}

	let changed = false;
	if (form.has(fieldName)) {
		changed = true
		form.delete(fieldName);
	}

	// console.log('val', val, 'Array.isArray(val)', Array.isArray(val));
	if (Array.isArray(val) || val instanceof FileList) {
		for (let i = 0; i < val.length; i++) {
			if (val[i] instanceof File) {
				changed = true
				form.append(fieldName, val[i], val[i].name);
			} else {
				changed = true
				form.append(fieldName, val[i]);
			}
		}
		return changed;
	}

	if (val instanceof File) {
		form.set(fieldName, val, val.name);
		return true
	} else {
		return formSet(form, fieldName, val);
	}
}

function formSet(form: FormData, fieldName: string, val: string): boolean {
	if (form.get(fieldName) === val) {
		return false
	}
	form.set(fieldName, val)
	return true
}

export function componentByTemplate(template: string, plaidForm: any): VueConstructor {
	return Vue.extend({
		inject: ['vars'],
		template: '<div>' + template + '</div>', // to make only one root.
		data: function () {
			return {
				plaidForm: plaidForm,
				locals: {},
			}
		}
	});
}
