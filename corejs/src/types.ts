export interface ValueOp {
	value: string | string[];
	add?: boolean;
	remove?: boolean;
}

interface PushStateQuery {
	[key: string]: null | undefined | string | string[] | ValueOp;
}

export interface PushState {
	mergeQuery?: boolean;
	url?: string;
	query?: PushStateQuery;
}

export interface EventFuncID {
	id: string;
	params?: string[];
	pushState?: PushState;
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
}

export interface StatePusher {
	pushState(data: any, title: string, url?: string | null): void;
}
