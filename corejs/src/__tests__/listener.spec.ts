import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick } from 'vue'

describe('listener', () => {
  it('access scoped slot', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope 
            :form-init='{}'
            v-slot='{ form: xform }' 
        >
          <go-plaid-listener 
            @presets-models-updated-examples-presets-credit-card='(a,b,c) => {
              xform.test1_1 = a.msg;
              xform.test1_2 = b;
              xform.test1_3 = c;
              xform.test1_4 = "test1_4_fixed";
            }' 
            @test-it2="(e) => {
              xform.test2 = e.b
            }"
            @test-no-payload='() => {
              xform.test3 = "got test-no-payload"
            }' 
          />
          <div id="div1_1">{{xform.test1_1}}</div>
          <div id="div1_2">{{xform.test1_2}}</div>
          <div id="div1_3">{{xform.test1_3}}</div>
          <div id="div1_4">{{xform.test1_4}}</div>
          <div id="div2">{{xform.test2}}</div>
          <div id="div3">{{xform.test3}}</div>
        </go-plaid-scope>
        
        <span id="span1" @click='plaid().vars(vars).emit("PresetsModelsUpdatedExamplesPresetsCreditCard", {"msg": "19"}, "msgb", "msgc")'></span>
        <span id="span2" @click='plaid().vars(vars).emit("TestIt2", {"b": "18"})'></span>
        <span id="span3" @click='plaid().vars(vars).emit("TestNoPayload")'></span>
      </div>
      `)

    await nextTick()

    expect(wrapper.find('#div1_1').text()).toEqual('')
    expect(wrapper.find('#div1_2').text()).toEqual('')
    expect(wrapper.find('#div1_3').text()).toEqual('')
    expect(wrapper.find('#div1_4').text()).toEqual('')
    expect(wrapper.find('#div2').text()).toEqual('')
    expect(wrapper.find('#div3').text()).toEqual('')

    await wrapper.find('#span1').trigger('click')
    expect(wrapper.find('#div1_1').text()).toEqual('19')
    expect(wrapper.find('#div1_2').text()).toEqual('msgb')
    expect(wrapper.find('#div1_3').text()).toEqual('msgc')
    expect(wrapper.find('#div1_4').text()).toEqual('test1_4_fixed')

    await wrapper.find('#span2').trigger('click')
    expect(wrapper.find('#div2').text()).toEqual('18')

    await wrapper.find('#span3').trigger('click')
    expect(wrapper.find('#div3').text()).toEqual('got test-no-payload')
  })
})
