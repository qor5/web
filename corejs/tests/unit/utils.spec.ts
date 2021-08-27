import {
	setFormValue,
} from '@/utils';

describe('utils', () => {

	it('setFormValue', () => {
		const fd = new FormData();
		setFormValue(fd, 'f1', ['1', '2']);
		expect(fd.getAll('f1')).toEqual(['1', '2']);
		setFormValue(fd, 'f1', '1');
		expect(fd.getAll('f1')).toEqual(['1']);
		expect(fd.get('f1')).toEqual('1');
	});

});
