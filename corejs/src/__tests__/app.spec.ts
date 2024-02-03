import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
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

  it('plaid varsScript', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { varsScript: 'vars.number = 42' })
    const wrapper = mountTemplate(
      `<h1 @click='plaid().eventFunc("hello").go()' :number="vars.number"></h1>`
    )
    await nextTick()
    await wrapper.find('h1').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').html()).toEqual(`<h1 number="42"></h1>`)
  })

  it('plaid varsScript with locals', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { varsScript: 'locals.number = 42' })
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
    mockFetchWithReturnTemplate(form, { varsScript: 'locals.number = 43' })
    await wrapper.find('h2').trigger('click')
    await flushPromises()
    expect(wrapper.find('h1').html()).toEqual(`<h1 number="42"></h1>`)
    expect(wrapper.find('h2').html()).toEqual(`<h2 number="43"></h2>`)
    console.log(wrapper.html())
  })
})
