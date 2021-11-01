export interface ValueOp {
	value: string | string[];
	add?: boolean;
	remove?: boolean;
}

export type QueryValue = null | undefined | string | string[] | ValueOp;

export interface Queries {
	[key: string]: QueryValue;
}

export interface Location {
	mergeQuery?: boolean;
	url?: string;
	query?: Queries;
}

export interface EventFuncID {
	id: string;
	location?: Location | string;
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
	pushState?: Location;
	reload?: boolean;
	reloadPortals?: string[];
	updatePortals?: PortalUpdate[];
	varsScript?: string;
}
