import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick } from 'vue'

describe('listener', () => {
  it('access scoped slot', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope 
            :form-init='{value: "", name:""}'
            v-slot='{ form: xform }' 
        >
          <go-plaid-listener event="test1" @on='({event, payload: xpayload}) => {
            xform.value = xpayload.a;
            xform.name = event;
          }' />
          <h1>{{xform.value}}</h1>
          <h2>{{xform.name}}</h2>
        </go-plaid-scope>
        
        <button @click='plaid().vars(vars).emit("test1", {"a": "19"})'></button>
      </div>
      `)

    await nextTick()
    expect(wrapper.find('h1').text()).toEqual('')
    expect(wrapper.find('h2').text()).toEqual('')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('h1').text()).toEqual('19')
    expect(wrapper.find('h2').text()).toEqual('test1')
  })
})
