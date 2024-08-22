import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'
import { HistoryManager } from '@/history'

describe('history', () => {
  it('push then push then back then forward then back then jump', async () => {
    const generateTemplate = (url: string) => {
      return `
        <button @click='plaid().pushState(true).url("${url}").go()'>go to ${url}</button>
        <span @click='plaid().pushState(true).url("/page666").go()'>go to /page666</span>
        `
    }
    const wrapper = mountTemplate(generateTemplate('/page1'))
    await nextTick()
    console.log(wrapper.html())

    const history = HistoryManager.getInstance()

    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, (url: any) => {
      const match = url.match(/\/page(\d+)/)
      const pageNum = match ? parseInt(match[1], 10) + 1 : 1
      const newUrl = `/page${pageNum}`
      console.log('newUrl', newUrl)
      return { body: generateTemplate(newUrl) }
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('button').text()).toEqual('go to /page2')
    expect(window.location.pathname).toEqual('/page1')
    expect(history.current().url).toEqual('/page1')
    expect(history.last()?.url).toEqual('/')
    expect(history.stack().length).toEqual(2)
    expect(history.currentIndex()).toEqual(1)

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('button').text()).toEqual('go to /page3')
    expect(window.location.pathname).toEqual('/page2')
    expect(history.current().url).toEqual('/page2')
    expect(history.last()?.url).toEqual('/page1')
    expect(history.stack().length).toEqual(3)
    expect(history.currentIndex()).toEqual(2)

    window.history.back()
    await waitUntil((): boolean => {
      return wrapper.find('button').text() === 'go to /page2'
    })
    expect(window.location.pathname).toEqual('/page1')
    expect(history.current().url).toEqual('/page1')
    expect(history.last()?.url).toEqual('/')
    expect(history.stack().length).toEqual(3)
    expect(history.currentIndex()).toEqual(1)

    window.history.forward()
    await waitUntil((): boolean => {
      return wrapper.find('button').text() === 'go to /page3'
    })
    expect(window.location.pathname).toEqual('/page2')
    expect(history.current().url).toEqual('/page2')
    expect(history.last()?.url).toEqual('/page1')
    expect(history.stack().length).toEqual(3)
    expect(history.currentIndex()).toEqual(2)

    window.history.back()
    await waitUntil((): boolean => {
      return wrapper.find('button').text() === 'go to /page2'
    })
    expect(window.location.pathname).toEqual('/page1')
    expect(history.current().url).toEqual('/page1')
    expect(history.last()?.url).toEqual('/')
    expect(history.stack().length).toEqual(3)
    expect(history.currentIndex()).toEqual(1)

    // jump to another page from the middle to test that the original subsequent history should be abandoned
    await wrapper.find('span').trigger('click') // to page666
    await flushPromises()
    expect(wrapper.find('button').text()).toEqual('go to /page667')
    expect(window.location.pathname).toEqual('/page666')
    expect(history.current().url).toEqual('/page666')
    expect(history.last()?.url).toEqual('/page1')
    expect(history.stack().length).toEqual(3)
    expect(history.currentIndex()).toEqual(2)
  })
})
