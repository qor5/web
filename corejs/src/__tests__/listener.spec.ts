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
          <go-plaid-listener @test1='(xpayload) => {
            xform.value = xpayload.a;
            xform.name = "test1";
          }' 
            @test-it2="(e) => {
                xform.test2 = e.b
            }"
          />
          <h1>{{xform.value}}</h1>
          <h2>{{xform.name}}</h2>
          <h3>{{xform.test2}}</h3>
        </go-plaid-scope>
        
        <button @click='plaid().vars(vars).emit("Test1", {"a": "19"})'></button>
        <span @click='plaid().vars(vars).emit("TestIt2", {"b": "18"})'></span>
      </div>
      `)

    await nextTick()
    expect(wrapper.find('h1').text()).toEqual('')
    expect(wrapper.find('h2').text()).toEqual('')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('h1').text()).toEqual('19')
    expect(wrapper.find('h2').text()).toEqual('test1')
    await wrapper.find('span').trigger('click')
    expect(wrapper.find('h3').text()).toEqual('18')
  })
})
