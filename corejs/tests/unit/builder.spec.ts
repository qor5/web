import {plaid} from "@/builder";


describe('builder', () => {
	it('pushState with object will merge into url queries', () => {
		const b = plaid().
			eventFunc("hello").
			query("name", "felix").
			mergeQuery(true).
			url("/page1?hello=1&page=2#scroll=123_0")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&hello=1&name=felix&page=2');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?hello=1&name=felix&page=2#scroll=123_0');
		expect(b.buildEventFuncID().location).toEqual({ name: ['felix'], hello: ['1'], page: ['2'] });
		expect(pushedData).toEqual({ query: { hello: '1', name: 'felix', page: '2' }, url: '/page1?hello=1&name=felix&page=2#scroll=123_0' });
	});

	it('pushState with string will replace url queries', () => {
		const b = plaid().
			eventFunc("hello").
			query("name", "felix").
			url("/page1?hello=1&page=2")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=felix');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?name=felix');
		expect(b.buildEventFuncID().location).toEqual({ name: ['felix'] });
		expect(pushedData).toEqual({ query: { name: 'felix' }, url: '/page1?name=felix' });
	});

	it('pushState with merge query without params will keep current url queries except for given params', () => {
		const b = plaid().
			stringLocation("missing_value=2&channel=2").
			mergeQueryWithoutParams(["missing_value", "channel"]).
			url("/page1?active_filter_tab=missing_value&missing_value=1&order_by=CreatedAt_ASC")

		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?active_filter_tab=missing_value&channel=2&missing_value=2&order_by=CreatedAt_ASC');
		expect(b.buildEventFuncID().location).toEqual({ "active_filter_tab":  ["missing_value"], "channel": ["2"], "missing_value": ["2"], "order_by": ["CreatedAt_ASC",]});
		expect(pushedData).toEqual({ query: { active_filter_tab: 'missing_value', channel: '2', missing_value: '2', order_by: 'CreatedAt_ASC'}, url: '/page1?active_filter_tab=missing_value&channel=2&missing_value=2&order_by=CreatedAt_ASC' });
	});

	it('add operator will add to current query values', () => {
		const b = plaid().
			eventFunc("hello").
			query("selectedIds", { value: '5', add: true }).
			mergeQuery(true).
			url("/page1?selectedIds=1,2,3&page=2")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&page=2&selectedIds=1,2,3,5');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?page=2&selectedIds=1,2,3,5');
		expect(b.buildEventFuncID().location).toEqual({ page: ['2'], selectedIds: ['1', '2', '3', '5'] });
		expect(pushedData).toEqual({ query: { page: '2', selectedIds: ['1', '2', '3', '5'] }, url: '/page1?page=2&selectedIds=1,2,3,5' });
	});

	it('remove operator will add to current query values', () => {
		const b = plaid().
			eventFunc("hello").
			query("selectedIds", { value: '5', remove: true }).
			mergeQuery(true).
			url("/page1?selectedIds=1,2,3,5&page=2")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&page=2&selectedIds=1,2,3');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?page=2&selectedIds=1,2,3');
		expect(b.buildEventFuncID().location).toEqual({ page: ['2'], selectedIds: ['1', '2', '3'] });
		expect(pushedData).toEqual({ query: { page: '2', selectedIds: ['1', '2', '3'] }, url: '/page1?page=2&selectedIds=1,2,3' });
	});


	it('array with comma', () => {
		const b = plaid().
			eventFunc("hello").
			query("names", ['Hello, Felix', 'How are you']).
			mergeQuery(true).
			url("/page1?selectedIds=1,2,3,5&page=2")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5');
		expect(b.buildEventFuncID().location).toEqual({ page: ['2'], selectedIds: ['1', '2', '3', '5'], names: ['Hello, Felix', 'How are you'] });
		expect(pushedData).toEqual({ query: { page: '2', selectedIds: ['1', '2', '3', '5'], names: ['Hello, Felix', 'How are you'] }, url: '/page1?names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5' });
	});


	it('first time add', () => {
		const b = plaid().
			eventFunc("hello").
			query("name", { value: '1', add: true }).
			mergeQuery(true).
			url("/page1")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=1');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?name=1');
		expect(b.buildEventFuncID().location).toEqual({ name: ['1'] });
		expect(pushedData).toEqual({ query: { name: ['1'] }, url: '/page1?name=1' });
	});


	it('add operator with value array', () => {
		const b = plaid().
			eventFunc("hello").
			query("name", { value: ['1', '2'], add: true }).
			mergeQuery(true).
			url("/page1")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=1,2');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?name=1,2');
		expect(b.buildEventFuncID().location).toEqual({ name: ['1', '2'] });
		expect(pushedData).toEqual({ query: { name: ['1', '2'] }, url: '/page1?name=1,2' });
	});

	it('remove operator with value array', () => {
		const b = plaid().
			eventFunc("hello").
			query("name", { value: ['1', '2', '5', '8'], remove: true }).
			mergeQuery(true).
			url("/page1?name=1,2,3,4,5,6,7,8,9")

		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=3,4,6,7,9');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page1?name=3,4,6,7,9');
		expect(b.buildEventFuncID().location).toEqual({ name: ['3', '4', '6', '7', '9'] });
		expect(pushedData).toEqual({ query: { name: ['3', '4', '6', '7', '9'] }, url: '/page1?name=3,4,6,7,9' });
	});

	it('remove operator with url and value array', () => {
		const b = plaid().
			eventFunc("hello").
			location({ url: '/page2?name=1,2,3,4,5,6,7,8,9', query: { name: { value: ['1', '2', '5', '8'], remove: true } }, mergeQuery: true }).
			url("/page1?name=1,2,3,4,5,6,7,8,9")

		expect(b.buildFetchURL()).toEqual('/page2?__execute_event__=hello&name=3,4,6,7,9');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page2?name=3,4,6,7,9');
		expect(b.buildEventFuncID().location).toEqual({ name: ['3', '4', '6', '7', '9'] });
		expect(pushedData).toEqual({ query: { name: ['3', '4', '6', '7', '9'] }, url: '/page2?name=3,4,6,7,9' });
	});


	it('with url', () => {
		const b = plaid().
			eventFunc("hello").
			location({ url: '/page2?name=2,3' }).
			url("/page1?name=1,2")

		expect(b.buildFetchURL()).toEqual('/page2?__execute_event__=hello&name=2,3');
		const [pushedData, title, url] = b.buildPushStateArgs()
		expect(url).toEqual('/page2?name=2,3');
		expect(b.buildEventFuncID().location).toEqual({ name: ['2', '3'] });
		expect(pushedData).toEqual({ query: { name: ['2', '3'] }, url: '/page2?name=2,3' });
	});



});
