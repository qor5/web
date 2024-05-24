import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { defineComponent, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import GoPlaidScope from '../go-plaid-scope.vue'
import GoPlaidPortal from '../go-plaid-portal.vue'

describe('run script', () => {
  it('set vars', async () => {
    const wrapper = mountTemplate(`
        <h1>{{vars.hello}}</h1>
      <go-plaid-run-script :script="function(){vars.hello=123}">
    </go-plaid-run-script>
      `)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual('123')
  })
})
