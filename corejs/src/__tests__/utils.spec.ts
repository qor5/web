import { setFormValue } from '../utils'
import { describe, it, expect } from 'vitest'

describe('utils', () => {
  it('setFormValue', () => {
    const fd = new FormData()
    setFormValue(fd, 'f1', ['1', '2'])
    expect(fd.getAll('f1')).toEqual(['1', '2'])
    setFormValue(fd, 'f1', '1')
    expect(fd.getAll('f1')).toEqual(['1'])
    expect(fd.get('f1')).toEqual('1')
    setFormValue(fd, 'field_empty', '')
    expect(fd.get('field_empty')).toEqual('')
    setFormValue(fd, 'field_empty', null)
    expect(fd.get('field_empty')).toEqual('')
    setFormValue(fd, 'field_empty', undefined)
    expect(fd.get('field_empty')).toEqual('')
  })
})
