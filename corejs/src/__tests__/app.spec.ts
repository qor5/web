import { describe, it, vi, expect } from 'vitest'
import { plaidPlugin, Root } from '../app'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

describe('app', () => {
  it('plaid', async () => {
    global.fetch = vi.fn().mockImplementation((url, opts) => {
      expect(new URLSearchParams(opts.body).toString()).toBe('a=42&b=nice')
      return new Promise((resolve) => resolve(new Response(`{"body": "<h3></h3>"}`)))
    })
    const r = mount(Root, {
      props: {
        initialTemplate: `<h1 @click='plaid().eventFunc("hello").fieldValue("a", 42).fieldValue("b", "nice").go()'></h1>`
      },
      global: {
        plugins: [plaidPlugin]
      }
    })
    await nextTick()
    await r.find('h1').trigger('click')
    //
    // console.log(r.html())
    // r.vm.changeTemplate(`<h2></h2>`)
    // await nextTick()
    // console.log(r.html())
  })
})
