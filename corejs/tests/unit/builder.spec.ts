import {plaid} from "@/builder";


describe('builder', () => {
	it('pushState with object will merge into url queries', () => {
		const b = plaid()
		expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&hello=1&name=felix&page=2');
		expect(b.buildPushedURL()).toEqual('/page1?hello=1&name=felix&page=2');
		expect(b.buildEventFuncID().pushState).toEqual({ name: ['felix'], hello: ['1'], page: ['2'] });
		expect(b.buildPushedData()).toEqual({ query: { hello: '1', name: 'felix', page: '2' }, url: '/page1?hello=1&name=felix&page=2' });
	});

});
