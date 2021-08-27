export interface ValueOp {
	value: string | string[];
	add?: boolean;
	remove?: boolean;
}

export type PushStateQueryValue = null | undefined | string | string[] | ValueOp;

export interface PushStateQuery {
	[key: string]: PushStateQueryValue;
}

export interface PushState {
	mergeQuery?: boolean;
	url?: string;
	query?: PushStateQuery;
}

export interface EventFuncID {
	id: string;
	params?: string[];
	pushState?: PushState | string;
}

export interface PortalUpdate {
	name: string;
	body: string;
	afterLoaded?: string;
}

export interface EventResponse {
	states?: any;
	body?: any;
	data?: any;
	redirectURL?: string;
	pageTitle?: string;
	pushState?: PushState;
	reload: boolean;
	reloadPortals?: string[];
	updatePortals?: PortalUpdate[];
	varsScript?: string;
}
