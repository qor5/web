import {
	EventFuncID,
	PushStateQuery,
	PushStateQueryValue,
} from './types';

class Builder {
	_eventFuncID?: string;
	_eventFuncParams?: string[];
	_debounceWait?: number;
	_url?: string;
	_event?: any;
	_fieldName?: string;
	_vars?: any;
	_query?: PushStateQuery;
	_mergeQuery?: boolean;
	_form?: FormData;
	_popstate?: boolean;

	public eventFunc(id: string, ...params: string[]): Builder {
		this._eventFuncID = id;
		this._eventFuncParams = params;
		return this;
	}

	public debounce(ms: number): Builder {
		this._debounceWait = ms;
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

	public fieldName(v: string): Builder {
		this._fieldName = v;
		return this;
	}

	public vars(v: any): Builder {
		this._vars = v;
		return this;
	}

	public query(key: string, val: PushStateQueryValue): Builder {
		if (!this._query) {
			this._query = {};
		}
		this._query[key] = val;
		return this;
	}

	public mergeQuery(v: boolean): Builder {
		this._mergeQuery = v;
		return this;
	}

	public form(v: FormData): Builder {
		this._form = v;
		return this;
	}

	public popstate(v: boolean): Builder {
		this._popstate = v;
		return this;
	}

	public buildFetchURL(): string {
		return "";
	}

	public buildPushedURL(): string {
		return "";
	}

	public buildEventFuncID(): EventFuncID {
		return {id: this._eventFuncID!, params: this._eventFuncParams}
	}

	public buildPushedData(): any {
		return {}
	}

	public buildEventData(): string {
		return "";
	}

	public go() {
		return;
	}
}

export function plaid(): Builder {
	return new Builder();
}
