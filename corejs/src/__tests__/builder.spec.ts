import { describe, it, expect } from 'vitest'
import { plaid } from '../builder'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

describe('builder', () => {
  it('pushState with object will merge into url queries', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('name', 'felix')
      .mergeQuery(true)
      .url('/page1?hello=1&page=2#scroll=123_0')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&hello=1&name=felix&page=2')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?hello=1&name=felix&page=2#scroll=123_0')
    expect(pushedData).toEqual({
      query: { hello: '1', name: 'felix', page: '2' },
      url: '/page1?hello=1&name=felix&page=2#scroll=123_0'
    })
  })

  it('pushState with string will replace url queries', () => {
    const b = plaid().eventFunc('hello').query('name', 'felix').url('/page1?hello=1&page=2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=felix')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=felix')
    expect(pushedData).toEqual({ query: { name: 'felix' }, url: '/page1?name=felix' })
  })

  it('pushState with pure url', () => {
    const b = plaid().eventFunc('hello').url('/page1?hello=1&page=2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&hello=1&page=2')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?hello=1&page=2')
    expect(pushedData).toEqual({ query: { hello: '1', page: '2' }, url: '/page1?hello=1&page=2' })
  })

  it('pushState with clearMergeQuery will delete provided keys then mergeQuery', () => {
    const b = plaid()
      .url(
        '/page1?active_filter_tab=missing_value&missing_value=1&approved.gte=1642003200&order_by=CreatedAt_ASC'
      )
      .stringQuery('missing_value=2&channel=2')
      .query('name', 'felix')
      .clearMergeQuery(['missing_value', 'channel', 'approved'])

    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual(
      '/page1?active_filter_tab=missing_value&channel=2&missing_value=2&name=felix&order_by=CreatedAt_ASC'
    )
    expect(pushedData).toEqual({
      query: {
        active_filter_tab: 'missing_value',
        channel: '2',
        name: 'felix',
        missing_value: '2',
        order_by: 'CreatedAt_ASC'
      },
      url: '/page1?active_filter_tab=missing_value&channel=2&missing_value=2&name=felix&order_by=CreatedAt_ASC'
    })
  })

  it('pushState with stringQuery empty will delete provided keys', () => {
    const b = plaid()
      .url(
        '/page1?active_filter_tab=missing_value&missing_value=1&approved.gte=1642003200&order_by=CreatedAt_ASC'
      )
      .clearMergeQuery(['missing_value', 'channel', 'approved'])

    const [, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?active_filter_tab=missing_value&order_by=CreatedAt_ASC')
  })

  it('add operator will add to current query values', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('selectedIds', { value: '5', add: true })
      .mergeQuery(true)
      .url('/page1?selectedIds=1,2,3&page=2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&page=2&selectedIds=1,2,3,5')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?page=2&selectedIds=1,2,3,5')
    expect(pushedData).toEqual({
      query: { page: '2', selectedIds: ['1', '2', '3', '5'] },
      url: '/page1?page=2&selectedIds=1,2,3,5'
    })
  })

  it('remove operator will add to current query values', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('selectedIds', { value: '5', remove: true })
      .mergeQuery(true)
      .url('/page1?selectedIds=1,2,3,5&page=2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&page=2&selectedIds=1,2,3')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?page=2&selectedIds=1,2,3')
    expect(pushedData).toEqual({
      query: { page: '2', selectedIds: ['1', '2', '3'] },
      url: '/page1?page=2&selectedIds=1,2,3'
    })
  })

  it('array with comma', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('names', ['Hello, Felix', 'How are you'])
      .mergeQuery(true)
      .url('/page1?selectedIds=1,2,3,5&page=2')

    expect(b.buildFetchURL()).toEqual(
      '/page1?__execute_event__=hello&names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5'
    )
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5')
    expect(pushedData).toEqual({
      query: {
        page: '2',
        selectedIds: ['1', '2', '3', '5'],
        names: ['Hello, Felix', 'How are you']
      },
      url: '/page1?names=Hello%2C%20Felix,How%20are%20you&page=2&selectedIds=1,2,3,5'
    })
  })

  it('first time add', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('name', { value: '1', add: true })
      .mergeQuery(true)
      .url('/page1')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=1')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=1')
    expect(pushedData).toEqual({ query: { name: ['1'] }, url: '/page1?name=1' })
  })

  it('add operator with value array', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('name', { value: ['1', '2'], add: true })
      .mergeQuery(true)
      .url('/page1')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=1,2')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=1,2')
    expect(pushedData).toEqual({ query: { name: ['1', '2'] }, url: '/page1?name=1,2' })
  })

  it('remove operator with value array', () => {
    const b = plaid()
      .eventFunc('hello')
      .query('name', { value: ['1', '2', '5', '8'], remove: true })
      .mergeQuery(true)
      .url('/page1?name=1,2,3,4,5,6,7,8,9')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=3,4,6,7,9')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=3,4,6,7,9')
    expect(pushedData).toEqual({
      query: { name: ['3', '4', '6', '7', '9'] },
      url: '/page1?name=3,4,6,7,9'
    })
  })

  it('remove operator with url and value array', () => {
    const b = plaid()
      .eventFunc('hello')
      .location({
        url: '/page2?name=1,2,3,4,5,6,7,8,9',
        query: { name: { value: ['1', '2', '5', '8'], remove: true } },
        mergeQuery: true
      })
      .url('/page1?name=1,2,3,4,5,6,7,8,9')

    expect(b.buildFetchURL()).toEqual('/page2?__execute_event__=hello&name=3,4,6,7,9')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page2?name=3,4,6,7,9')
    expect(pushedData).toEqual({
      query: { name: ['3', '4', '6', '7', '9'] },
      url: '/page2?name=3,4,6,7,9'
    })
  })

  it('with url', () => {
    const b = plaid().eventFunc('hello').location({ url: '/page2?name=2,3' }).url('/page1?name=1,2')

    expect(b.buildFetchURL()).toEqual('/page2?__execute_event__=hello&name=2,3')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page2?name=2,3')
    expect(pushedData).toEqual({ query: { name: ['2', '3'] }, url: '/page2?name=2,3' })
  })

  it('location is not set', () => {
    const b = plaid().eventFunc('hello').url('/page1?name=1,2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello&name=1,2')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=1,2')
    expect(pushedData).toEqual({ query: { name: ['1', '2'] }, url: '/page1?name=1,2' })
  })

  it('without eventFunc', () => {
    const b = plaid().url('/page1?name=1,2')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=__reload__&name=1,2')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?name=1,2')
    expect(pushedData).toEqual({ query: { name: ['1', '2'] }, url: '/page1?name=1,2' })
  })

  it('add new props and set fieldValue with a func', () => {
    const b = plaid()
      .eventFunc('hello')
      .fieldValue('name', 'felix')
      .fieldValue(
        'age',
        (function () {
          return 10
        })()
      )
      .run(function (b: any) {
        b.storedAvatar = '_storedAvatar_'
      })
      .fieldValue('avatar', function (b: any) {
        return b.storedAvatar
      })
      .url('/page1')

    expect(b.buildFetchURL()).toEqual('/page1?__execute_event__=hello')
    const [pushedData, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1')
    expect(pushedData).toEqual({
      query: {},
      url: '/page1'
    })
    expect(b._form).toEqual({
      age: 10,
      avatar: '_storedAvatar_',
      name: 'felix'
    })
  })

  it('beforeFetch', async () => {
    const template = `
      <button @click='plaid().pushState(true).beforeFetch(({url, opts}) => {
        url = "/pagexxx";
        opts.body.set("name", "felix");
        return [url, opts]
      }).go()'>go to /page1</button>
    `
    const wrapper = mountTemplate(template)
    await nextTick()
    console.log(wrapper.html())

    let lastURL, lastOpts: any
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, (url: any, opts: any) => {
      lastURL = url
      lastOpts = opts
      return { body: template }
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(lastURL).toEqual('/pagexxx')
    expect(lastOpts.body.get('name')).toEqual('felix')
  })

  it('stringifyOptions with encode true', () => {
    const b = plaid()
      .url('/page1?')
      .stringQuery('order_bys=Name|ASC,Age|DESC')
      .stringifyOptions({ arrayFormat: 'comma', encode: true })
    const [, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?order_bys=Name%7CASC,Age%7CDESC')
  })

  it('stringifyOptions with encode false', () => {
    const b = plaid()
      .url('/page1?')
      .stringQuery('order_bys=Name|ASC,Age|DESC')
      .stringifyOptions({ arrayFormat: 'comma', encode: false })
    const [, , url] = b.buildPushStateArgs()
    expect(url).toEqual('/page1?order_bys=Name|ASC,Age|DESC')
  })

  it('lodash', () => {
    const obj1 = {
      name: 'Alice',
      age: 25,
      version: '1.0',
      details: {
        city: 'New York'
      }
    }

    const obj2 = {
      name: 'Alice',
      details: {
        city: 'New York'
      },
      age: 25,
      version: '2.0'
    }
    expect(plaid().lodash.isEqual(obj1, obj2)).toEqual(false)
    expect(
      plaid().lodash.isEqual(
        plaid().lodash.omit(obj1, 'version'),
        plaid().lodash.omit(obj2, 'version')
      )
    ).toEqual(true)
  })
})
