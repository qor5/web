import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('app', () => {
  it('plaid fieldValue', async () => {
    const form = ref(new FormData())

    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(
      `<h1 @click='plaid().eventFunc("hello").fieldValue("a", 42).fieldValue("b", "nice").go()'></h1>`
    )
    await nextTick()
    await wrapper.find('h1').trigger('click')
    await flushPromises()
    expect(Object.fromEntries(form.value)).toEqual({ a: '42', b: 'nice' })
    expect(wrapper.find('h3').html()).toEqual(`<h3></h3>`)
  })

  it('plaid runScript', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { runScript: 'vars.number = 42' })
    const wrapper = mountTemplate(
      `<h1 @click='plaid().eventFunc("hello").go()' :number="vars.number"></h1>`
    )
    await nextTick()
    await wrapper.find('h1').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').html()).toEqual(`<h1 number="42"></h1>`)
  })

  it('plaid runScript with locals', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { runScript: 'locals.number = 42' })
    const wrapper = mountTemplate(
      `
      <go-plaid-scope v-slot="{locals}">
          <h1 @click='plaid().locals(locals).eventFunc("hello").go()' :number="locals.number"></h1>
          <go-plaid-scope v-slot="{locals}">
              <h2 @click='plaid().locals(locals).eventFunc("hello").go()' :number="locals.number"></h2>
          </go-plaid-scope>
      </go-plaid-scope>
    `
    )
    await nextTick()
    await wrapper.find('h1').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').html()).toEqual(`<h1 number="42"></h1>`)
    mockFetchWithReturnTemplate(form, { runScript: 'locals.number = 43' })
    await wrapper.find('h2').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').html()).toEqual(`<h1 number="42"></h1>`)
    expect(wrapper.find('h2').html()).toEqual(`<h2 number="43"></h2>`)
    console.log(wrapper.html())
  })

  it('plaid pushState dead loop', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, (url: any, opts: any) => {
      if (url.includes('__reload__')) {
        return { body: '<h6></h6>' }
      } else {
        return { body: '', pushState: { mergeQuery: true, query: { panel: ['1'] } } }
      }
    })
    const wrapper = mountTemplate(
      `
      <button @click='plaid().locals(locals).eventFunc("hello").go()'></button>
    `
    )
    await nextTick()
    await wrapper.find('button').trigger('click')
    console.log(wrapper.html())
  })

  it('GlobalEvents', async () => {
    const wrapper = mountTemplate(
      `
      <go-plaid-scope v-slot="{locals}" :init='{count: 10}'>
        <h1>{{ locals.count }}</h1>
        <global-events @keydown.enter='locals.count = 42'></global-events>
      </go-plaid-scope>
    `
    )
    await nextTick()
    const event = new KeyboardEvent('keydown', { key: 'Enter' })
    document.dispatchEvent(event)
    await flushPromises()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual(`42`)
  })

  it('pushState and browser back button', async () => {
    const template = `<button @click='plaid().pushState(true).url("/test").go()'>go</button>`
    const wrapper = mountTemplate(template)
    await nextTick()
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, (url: any, opts: any) => {
      if (url.includes('/test')) {
        return { body: '<h3>result</h3>' }
      }

      return { body: template }
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(window.location.pathname).toEqual('/test')
    expect(wrapper.find('h3').html()).toEqual(`<h3>result</h3>`)

    window.history.back()
    // window.dispatchEvent(new PopStateEvent('popstate', { state: { someState: 'test' } }));

    await nextTick()
    console.log(wrapper.html())
    await waitUntil((): boolean => {
      return wrapper.find('button').exists()
    })
    await flushPromises()
    console.log(wrapper.html())
  })
})
