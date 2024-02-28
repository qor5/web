import { objectToFormData, setFormValue } from '../utils'
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

  describe('objectToFormData with Go struct naming conventions', () => {
    it('converts objects with nested structures to FormData', () => {
      const userProfile = {
        Name: 'John Doe',
        Age: 30,
        Hobbies: ['coding', 'reading'],
        Address: {
          City: 'New York',
          Country: 'USA'
        },
        Twitter: null,
        Facebook: undefined,
        Employees: [
          { Name: 'John Doe', Age: 30 },
          { Name: 'Jane Doe', Age: 25 }
        ],
        Photos: [new File(['content'], 'photo1.jpg'), new File(['content'], 'photo2.jpg')]
      }
      const formData = new FormData()
      objectToFormData(userProfile, formData)

      expect(formData.get('Name')).toBe('John Doe')
      expect(formData.get('Age')).toBe('30')
      expect(formData.getAll('Hobbies')).toEqual(['coding', 'reading'])
      expect(formData.get('Address.City')).toBe('New York')
      expect(formData.get('Address.Country')).toBe('USA')
      expect(formData.get('Employees[0].Name')).toBe('John Doe')
      expect(formData.get('Employees[0].Age')).toBe('30')
      expect(formData.get('Employees[1].Name')).toBe('Jane Doe')
      expect(formData.get('Employees[1].Age')).toBe('25')
      expect(formData.getAll('Photos')[0]).toBeInstanceOf(File)
      expect(formData.getAll('Photos')[1]).toBeInstanceOf(File)
    })
  })
})
