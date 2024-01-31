import { describe, it, expect } from 'vitest'
import { goplaidPlugin, Root } from '../app'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

describe('app', () => {
  it('$plaid', async () => {
    const r = mount(Root, {
      props: { initialTemplate: `<h1 @click='$plaid().fieldValue("a", 1)'>123</h1>` },
      global: {
        plugins: [goplaidPlugin]
      }
    })
    await nextTick()
    await r.find('h1').trigger('click')
    console.log(r.html())
    r.vm.changeTemplate(`<h2></h2>`)
    await nextTick()
    console.log(r.html())
  })
})
