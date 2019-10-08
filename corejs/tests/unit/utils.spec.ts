import {
	newFormWithStates,
	setPushState,
	setFormValue,
} from '@/utils';

import {
	EventFuncID,
} from '@/types';


describe('utils', () => {
	it('newFormWithStates', () => {
		const fd = newFormWithStates({ f1: ['1'], f2: ['2'] });
		expect(fd.get('f1')).toBe('1');
	});

	it('setFormValue, getFormValue, getFormValueAsArray', () => {
		const fd = new FormData();
		setFormValue(fd, 'f1', ['1', '2']);
		expect(fd.getAll('f1')).toEqual(['1', '2']);
		setFormValue(fd, 'f1', '1');
		expect(fd.getAll('f1')).toEqual(['1']);
		expect(fd.get('f1')).toEqual('1');
	});

	describe('setPushState', () => {

		interface MyTestCase {
			desc: string;
			eventFuncID: EventFuncID;
			url: string;
			popstate: boolean;
			expectedEventURL: string;
			expectedPushedURL: string;
			expectedPushedState: any;
			expectedPushedData?: any;
		}

		const testCases: MyTestCase[] = [
			{
				desc: 'pushState with object will merge into url queries',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { name: 'felix' }, mergeQuery: true },
				},
				url: '/page1?hello=1&page=2',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&hello=1&name=felix&page=2',
				expectedPushedURL: '/page1?hello=1&name=felix&page=2',
				expectedPushedState: { name: ['felix'], hello: ['1'], page: ['2'] },
				expectedPushedData: { query: { hello: '1', name: 'felix', page: '2' }, url: '/page1?hello=1&name=felix&page=2' },
			},
			{
				desc: 'pushState with string will replace url queries',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { name: 'felix' } },
				},
				url: '/page1?hello=1&page=2',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&name=felix',
				expectedPushedURL: '/page1?name=felix',
				expectedPushedState: { name: ['felix'] },
				expectedPushedData: { query: { name: 'felix' }, url: '/page1?name=felix' },
			},
			{
				desc: 'add operator will add to current query values',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { selectedIds: { value: '5', add: true } }, mergeQuery: true },
				},
				url: '/page1?selectedIds=1,2,3&page=2',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&page=2&selectedIds=1,2,3,5',
				expectedPushedURL: '/page1?page=2&selectedIds=1,2,3,5',
				expectedPushedState: { page: ['2'], selectedIds: ['1', '2', '3', '5'] },
				expectedPushedData: { query: { page: '2', selectedIds: ['1', '2', '3', '5'] }, url: '/page1?page=2&selectedIds=1,2,3,5' },
			},
			{
				desc: 'remove operator will add to current query values',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { selectedIds: { value: '5', remove: true } }, mergeQuery: true },
				},
				url: '/page1?selectedIds=1,2,3,5&page=2',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&page=2&selectedIds=1,2,3',
				expectedPushedURL: '/page1?page=2&selectedIds=1,2,3',
				expectedPushedState: { page: ['2'], selectedIds: ['1', '2', '3'] },
			},
			{
				desc: 'array with comma',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { names: ['Hello, Felix', 'How are you'] }, mergeQuery: true },
				},
				url: '/page1?selectedIds=1,2,3,5&page=2',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5',
				expectedPushedURL: '/page1?names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5',
				expectedPushedState: { page: ['2'], selectedIds: ['1', '2', '3', '5'], names: ['Hello, Felix', 'How are you'] },
			},
			{
				desc: 'first time add',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { name: { value: '1', add: true } }, mergeQuery: true },
				},
				url: '/page1',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&name=1',
				expectedPushedURL: '/page1?name=1',
				expectedPushedState: { name: ['1'] },
			},
			{
				desc: 'add operator with value array',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { name: { value: ['1', '2'], add: true } }, mergeQuery: true },
				},
				url: '/page1',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&name=1,2',
				expectedPushedURL: '/page1?name=1,2',
				expectedPushedState: { name: ['1', '2'] },
			},
			{
				desc: 'remove operator with value array',
				eventFuncID: {
					id: 'hello',
					pushState: { query: { name: { value: ['1', '2', '5', '8'], remove: true } }, mergeQuery: true },
				},
				url: '/page1?name=1,2,3,4,5,6,7,8,9',
				popstate: false,
				expectedEventURL: '/page1?__execute_event__=hello&name=3,4,6,7,9',
				expectedPushedURL: '/page1?name=3,4,6,7,9',
				expectedPushedState: { name: ['3', '4', '6', '7', '9'] },
			},
			{
				desc: 'remove operator with url and value array',
				eventFuncID: {
					id: 'hello',
					pushState: { url: '/page2?name=1,2,3,4,5,6,7,8,9', query: { name: { value: ['1', '2', '5', '8'], remove: true } }, mergeQuery: true },
				},
				url: '/page1?name=1,2,3,4,5,6,7,8,9',
				popstate: false,
				expectedEventURL: '/page2?__execute_event__=hello&name=3,4,6,7,9',
				expectedPushedURL: '/page2?name=3,4,6,7,9',
				expectedPushedState: { name: ['3', '4', '6', '7', '9'] },
			},
			{
				desc: 'with url',
				eventFuncID: {
					id: 'hello',
					pushState: { url: '/page2?name=2,3' },
				},
				url: '/page1?name=1,2',
				popstate: false,
				expectedEventURL: '/page2?__execute_event__=hello&name=2,3',
				expectedPushedURL: '/page2?name=2,3',
				expectedPushedState: { name: ['2', '3'] },
			},
		];


		const pusher = {
			pushed: {} as any,
			pushState: (data: any, title: string, url?: string | null) => {
				pusher.pushed = {
					data,
					title,
					url,
				};
			},
		};

		for (const c of testCases) {
			it(c.desc, () => {
				const { newEventFuncId, eventURL } = setPushState(
					c.eventFuncID,
					c.url,
					pusher,
					c.popstate,
				);
				expect(eventURL).toBe(c.expectedEventURL);
				expect(pusher.pushed.url).toBe(c.expectedPushedURL);
				expect(newEventFuncId.pushState).toEqual(c.expectedPushedState);
				if (c.expectedPushedData) {
					expect(pusher.pushed.data).toEqual(c.expectedPushedData);
				}
			});
		}

	});
});
