import {
  objectToFormData,
  setFormValue,
  encodeObjectToQuery,
  isRawQuerySubset,
  parsePathAndQuery,
  generateUniqueId,
  slug
} from '../utils'
import { describe, it, expect } from 'vitest'
import { plaid } from '../builder'

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

  it('encodeObjectToQuery', () => {
    const exampleObject = {
      compo_id: 'customers',
      long_style_search_box: false,
      selected_ids: ['x,', 'y', 'z'],
      keyword: '',
      order_bys: [
        {
          FieldName: 'Name|',
          'Order,By': 'ASC'
        },
        {
          'Fiel|dName': 'Age',
          OrderBy: 'DES,C'
        }
      ],
      page: 0,
      per_page: 0,
      'chi,ld': {
        a: 'aa',
        b: 100
      },
      active_filter_tab: 'tab2',
      filter_query: 'f_approved.gte=0001-01-01+00%3A00&f_name.ilike=felix',
      display_columns: null
    }
    const queryTags = [
      {
        name: 'xpage',
        json_name: 'page',
        omitempty: false
      },
      {
        name: 'per_page',
        json_name: 'per_page',
        omitempty: true
      },
      {
        name: 'chi,ld',
        json_name: 'chi,ld',
        omitempty: true
      },
      {
        name: 'xselected_ids',
        json_name: 'selected_ids',
        omitempty: true
      },
      {
        name: 'display_columns',
        json_name: 'display_columns',
        omitempty: false
      },
      {
        name: 'order_bys',
        json_name: 'order_bys',
        omitempty: true
      },
      {
        name: 'testUndefined',
        json_name: 'testUndefined',
        omitempty: true
      },
      {
        name: 'filter_query',
        json_name: 'filter_query',
        omitempty: true,
        encoder: ({ value, queries }: { value: string; queries: string[]; tag: any }) => {
          if (value) {
            value.split('&').forEach((query) => {
              queries.push(query)
            })
          }
        }
      }
    ]
    const queryString = encodeObjectToQuery(exampleObject, queryTags)
    expect(queryString).toEqual(
      'xpage=0&chi%2Cld=aa_100&xselected_ids=x%2C,y,z&display_columns=&order_bys=Name%7C_ASC,Age_DES%2CC&f_approved.gte=0001-01-01+00%3A00&f_name.ilike=felix'
    )
  })

  it('isRawQuerySubset', () => {
    const sup = 'id=1&name=John&age=30&emails=a%2C,b,c'
    let sub = 'id=1&name=John&age=30'
    expect(isRawQuerySubset(sup, sub)).toBe(true)

    sub = 'id=1&name=John&age=30&emails=a%2C,b'
    expect(isRawQuerySubset(sup, sub)).toBe(true)

    sub = 'id=1&name=John&age=30&emails=a%2C,b,c'
    expect(isRawQuerySubset(sup, sub)).toBe(true)

    sub = 'id=1&name=John&age=30&emails=a%2C&emails=b&emails=c' // emails: only 'c' is valid
    expect(isRawQuerySubset(sup, sub)).toBe(true)

    sub = 'id=1&name=John&age=30&emails=a%2C&emails=b&emails=d' // emails: only 'd' is valid
    expect(isRawQuerySubset(sup, sub)).toBe(false)

    sub = 'id=1&name=John&age=30&emails=a%2C,b,c&addresses=Shanghai'
    expect(isRawQuerySubset(sup, sub)).toBe(false)
  })

  it('parsePathAndQuery', () => {
    expect(
      parsePathAndQuery('https://www.example.com/path/to/resource?name=value&key=value')
    ).toEqual('/path/to/resource?name=value&key=value')
    expect(parsePathAndQuery('https://www.example.com')).toEqual('/')
    expect(parsePathAndQuery('/path/to/resource?name=value&key=value')).toEqual(
      '/path/to/resource?name=value&key=value'
    )
    expect(parsePathAndQuery('/path/to/resource?name=value&key=value#1')).toEqual(
      '/path/to/resource?name=value&key=value#1'
    )
  })

  it('generateUniqueId', () => {
    const a = generateUniqueId()
    const b = generateUniqueId()
    expect(a.length).toEqual(7)
    expect(b.length).toEqual(7)
    expect(a).not.toEqual(b)
  })

  it('slug', () => {
    expect(plaid().slug('test title slug')).toEqual('test-title-slug')
    expect(plaid().slug('test&title*~slug')).toEqual('test-title-slug')
    expect(plaid().slug('TestSlug')).toEqual('testslug')
    expect(plaid().slug('测试标题')).toEqual('ce-shi-biao-ti')
  })
})
