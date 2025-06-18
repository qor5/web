import 'formdata-polyfill'
import querystring from 'query-string'
import union from 'lodash/union'
import without from 'lodash/without'
import unidecode from 'unidecode'
import type { EventFuncID, ValueOp } from './types'
import { type DefineComponent, defineComponent, inject, ref, type Ref } from 'vue'

export function buildPushState(eventFuncId: EventFuncID, url: string): any {
  const loc = eventFuncId.location
  const orig = querystring.parseUrl(loc?.url || url, {
    arrayFormat: 'comma',
    parseFragmentIdentifier: true
  })

  const resultQuery: any = {}
  let locQuery
  // If pushState is string, then replace query string to it
  // If pushState it object, merge url query
  if (loc) {
    if (loc.stringQuery) {
      const strQuery = querystring.parse(loc.stringQuery, { arrayFormat: 'comma' })
      // @ts-ignore
      loc.query = { ...strQuery, ...loc.query }
    }

    if (loc.mergeQuery) {
      const clearKeys = loc.clearMergeQueryKeys || []
      for (const [key, value] of Object.entries(orig.query)) {
        // If clearMergeQueryKeys is present then skip current location queries which contained by clearMergeQueryKeys
        // If clearMergeQueryKeys is empty, all queries from current location will be kept
        if (clearKeys.indexOf(key.split('.')[0]) < 0) {
          resultQuery[key] = value
        }
      }
      if (!loc.query) {
        loc.query = {}
      }
    }
    locQuery = loc.query
  }

  const st = locQuery || orig.query
  let addressBarQuery = ''
  for (const [key, v] of Object.entries(st)) {
    if (Array.isArray(v)) {
      resultQuery[key] = v
    } else if (typeof v === 'object') {
      const valueOp = v as ValueOp
      queryUpdateByValueOp(resultQuery, key, valueOp)
    } else {
      resultQuery[key] = v
    }
  }

  const requestQuery = { ...resultQuery, ...{ __execute_event__: eventFuncId.id } }

  const stringifyOpts = loc?.stringifyOptions || { arrayFormat: 'comma' }

  addressBarQuery = querystring.stringify(resultQuery, stringifyOpts)
  if (addressBarQuery.length > 0) {
    addressBarQuery = `?${addressBarQuery}`
  }

  let newUrl = orig.url + addressBarQuery
  if (orig.fragmentIdentifier) {
    newUrl = newUrl + '#' + orig.fragmentIdentifier
  }
  const pushedState = { query: resultQuery, url: newUrl }

  return {
    pushStateArgs: [pushedState, '', newUrl],
    eventURL: `${orig.url}?${querystring.stringify(requestQuery, stringifyOpts)}`
  }
}

function queryUpdateByValueOp(query: any, key: string, valueOp: ValueOp): void {
  if (!valueOp.value) {
    return
  }

  let opValues: any = valueOp.value
  if (!Array.isArray(valueOp.value)) {
    opValues = [valueOp.value]
  }

  let values = query[key]
  if (values && !Array.isArray(values)) {
    values = [values]
  }

  if (valueOp.add) {
    query[key] = union(values, opValues)
    return
  }

  if (valueOp.remove) {
    const newValues = without(values, ...opValues)
    if (newValues.length === 0) {
      delete query[key]
    } else {
      query[key] = newValues
    }
  }
  return
}

export function setFormValue(form: FormData, fieldName: string, val: any): boolean {
  // console.log("setFormValue", inspectFormData(form), fieldName, val)
  if (!fieldName || fieldName.length === 0) {
    return false
  }

  if (val instanceof Event) {
    return setFormValue(form, fieldName, val.target)
  }

  if (val instanceof HTMLInputElement) {
    // console.log("target.value = ", target.value, ", target.type = ", target.type, ", target.checked = ", target.checked)
    if (val.files) {
      return setFormValue(form, fieldName, val.files)
    }

    switch (val.type) {
      case 'checkbox':
        if (val.checked) {
          return formSet(form, fieldName, val.value)
        } else {
          if (form.has(fieldName)) {
            form.delete(fieldName)
            return true
          }
        }
        return false
      case 'radio':
        if (val.checked) {
          return formSet(form, fieldName, val.value)
        }
        return false
      default:
        return formSet(form, fieldName, val.value)
    }
  }

  if (val instanceof HTMLTextAreaElement) {
    return formSet(form, fieldName, val.value)
  }

  if (val instanceof HTMLSelectElement) {
    return formSet(form, fieldName, val.value)
  }

  if (val === null || val === undefined) {
    return formSet(form, fieldName, '')
  }

  let changed = false
  if (form.has(fieldName)) {
    changed = true
    form.delete(fieldName)
  }

  // console.log('val', val, 'Array.isArray(val)', Array.isArray(val));
  if (Array.isArray(val) || val instanceof FileList) {
    for (let i = 0; i < val.length; i++) {
      if (val[i] instanceof File) {
        changed = true
        form.append(fieldName, val[i], val[i].name)
      } else {
        changed = true
        form.append(fieldName, val[i])
      }
    }
    return changed
  }

  if (val instanceof File) {
    form.set(fieldName, val, val.name)
    return true
  } else {
    return formSet(form, fieldName, val)
  }
}

function formSet(form: FormData, fieldName: string, val: string): boolean {
  if (form.get(fieldName) === val) {
    return false
  }
  form.set(fieldName, val)
  return true
}

export function componentByTemplate(
  template: string,
  form: any,
  locals: any = {},
  dash: any = {},
  portal: Ref = ref()
): DefineComponent {
  return defineComponent({
    setup() {
      return {
        plaid: inject('plaid'),
        vars: inject('vars'),
        isFetching: inject('isFetching'),
        updateRootTemplate: inject('updateRootTemplate'),
        form: form,
        locals: locals,
        dash: dash
      }
    },
    mounted() {
      this.$nextTick(() => /**/ {
        if (this.$el && this.$el.style && this.$el.style.height) {
          portal.value.style.height = this.$el.style.height
        }
      })
    },
    template
  })
}

export function registerEvent(el: any, event: string, listener: any, options: any) {
  el.addEventListener(event, listener, options)
  return () => el.removeEventListener(event, listener, options)
}

export function objectToFormData(obj: any, form: FormData, parentKey = '') {
  if (obj === undefined || obj === null) {
    return
  }
  const isArr = Array.isArray(obj)
  if (isArr && obj.length > 0) {
    if (obj[0] instanceof File || obj[0] instanceof Blob || typeof obj[0] === 'string') {
      setFormValue(form, parentKey, obj)
      return
    }
  }
  Object.keys(obj).forEach((key) => {
    const value = obj[key]
    // Construct the form key
    const formKey = parentKey ? (isArr ? `${parentKey}[${key}]` : `${parentKey}.${key}`) : key

    if (typeof value === 'object' && !(value instanceof File) && !(value instanceof Date)) {
      objectToFormData(value, form, formKey)
    } else {
      setFormValue(form, formKey, value)
    }
  })

  return form
}

export function encodeObjectToQuery(
  obj: any,
  queryTags: { name: string; json_name: string; omitempty: boolean; encoder?: Function }[]
) {
  if (queryTags.length === 0) {
    return ''
  }

  const processObject = (obj: any) => {
    return Object.keys(obj)
      .sort()
      .map((key) => {
        const encodedValue = encodeURIComponent(obj[key])
        if (encodedValue.includes('_')) {
          throw new Error(`Value contains underscore (_) which is not allowed: ${encodedValue}`)
        }
        return encodedValue
      })
      .join('_')
  }

  const processArray = (arr: []) => {
    return arr
      .map((item) => {
        if (typeof item === 'object' && !Array.isArray(item)) {
          return processObject(item)
        } else {
          return encodeURIComponent(item)
        }
      })
      .join(',')
  }

  const queries: string[] = []

  queryTags.forEach((tag) => {
    const value: any = obj[tag.json_name]
    if (value === undefined) {
      return
    }

    if (tag.encoder) {
      tag.encoder({ value, queries, tag })
      return
    }

    const key = encodeURIComponent(tag.name)
    if (!value && tag.omitempty) {
      return
    }
    if (value === null) {
      queries.push(`${key}=`)
    } else if (Array.isArray(value)) {
      if (tag.omitempty && obj[tag.json_name].length === 0) {
        return
      }
      queries.push(`${key}=${processArray(obj[tag.json_name])}`)
    } else if (typeof value === 'object') {
      queries.push(`${key}=${processObject(value)}`)
    } else {
      queries.push(`${key}=${encodeURIComponent(value)}`)
    }
  })

  return queries.join('&')
}

function isQuerySubset(
  sup: querystring.ParsedQuery<string>,
  sub: querystring.ParsedQuery<string>
): boolean {
  for (const key in sub) {
    if (sup[key] === undefined) {
      return false
    }

    const supValues = Array.isArray(sup[key]) ? (sup[key] as string[]) : [sup[key] as string]
    const subValues = Array.isArray(sub[key]) ? (sub[key] as string[]) : [sub[key] as string]

    const supCount: Record<string, number> = {}
    supValues.forEach((value) => {
      supCount[value] = (supCount[value] || 0) + 1
    })

    for (const value of subValues) {
      if (!supCount[value] || supCount[value] === 0) {
        return false
      }
      supCount[value]--
    }
  }
  return true
}

export function isRawQuerySubset(
  sup: string,
  sub: string,
  options?: querystring.ParseOptions
): boolean {
  if (options === undefined) {
    options = { arrayFormat: 'comma' }
  }
  const supValues = querystring.parse(sup, options)
  const subValues = querystring.parse(sub, options)
  return isQuerySubset(supValues, subValues)
}

export function parsePathAndQuery(href: string) {
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href)) {
    const url = new URL(href)
    return url.pathname + url.search
  }
  return href
}

export function generateUniqueId(): string {
  return Math.random().toString(36).slice(2, 9)
}

export function sleep(delay = 1000) {
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve(undefined)
    }, delay)
  })
}

export function slug(value: string): string {
  value = value.trim()
  value = unidecode(value)
  value = value.toLowerCase()
  value = value.replace(/[^a-zA-Z0-9-_]/g, '-')
  value = value.replace(/-+/g, '-')
  value = value.replace(/^[-_]+|[-_]+$/g, '')
  return value
}

export function findScrollableParent(element: Element | null): Element | null {
  if (!element) return null

  let parent = element.parentElement

  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent)

    const overflowY = style.overflowY
    const overflow = style.overflow
    if (
      overflowY === 'scroll' ||
      overflowY === 'auto' ||
      overflow === 'scroll' ||
      overflow === 'auto'
    ) {
      if (parent.scrollHeight > parent.clientHeight) {
        return parent
      }
    }

    if (parent.scrollHeight > parent.clientHeight && parent.scrollTop >= 0) {
      return parent
    }

    parent = parent.parentElement
  }
  return document.scrollingElement || document.documentElement
}
