import { describe, it, expect } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick } from 'vue'

describe('scope', () => {
  it('vars and form', async () => {
    const wrapper = mountTemplate(`
      <div>
      <go-plaid-scope :init='{hello: "123"}' v-slot="{locals}">
        <div id="l1">{{ locals.hello }}</div>
        <button id="l1Btn" @click='locals.hello = "456"'></button>
        <go-plaid-scope :init='{hello: "789"}' v-slot="{locals}">
          <div id="l2">{{ locals.hello }}</div>
          <button id="l2Btn" @click='locals.hello = "999"'></button>

          <go-plaid-scope v-slot="{form}">
            <div id="l3">{{ form.Name }}</div>
            <input type="text"
                 :value='form.Name = "AAA"'>
            <button id="l3Btn"
                @click='locals.hello = form.Name'></button>

            <go-plaid-scope v-slot="{ form }">
              <div id="l4">{{ form.Name }}</div>
              <input id="input4" type="text"
                   :value='form.Name = "BBB"'>

            </go-plaid-scope>

          </go-plaid-scope>

        </go-plaid-scope>
      </go-plaid-scope>
      <div class="globalForm">{{form.Name}}</div>
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())

    const btn: any = wrapper.find('#l1Btn')
    await btn.trigger('click')
    const l1: any = wrapper.find('#l1')
    expect(l1.text()).toEqual(`456`)

    const btn2: any = wrapper.find('#l2Btn')
    await btn2.trigger('click')
    const l2: any = wrapper.find('#l2')
    expect(l2.text()).toEqual(`999`)

    const btn3: any = wrapper.find('#l3Btn')
    const input4: any = wrapper.find('#input4')
    await input4.setValue('CCC')
    await btn3.trigger('click')
    console.log(wrapper.html())
    const l3: any = wrapper.find('#l3')
    expect(l2.text()).toEqual(`AAA`)
    expect(l3.text()).toEqual(`AAA`)
    const l4: any = wrapper.find('#l4')
    expect(l4.text()).toEqual(`BBB`)
  })

  it('scope init can be array or object', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope :init='[{hello: "123"}, {checked: true}, {file: "two"}]' v-slot="{ locals }">
         <div id="testArray">{{ locals.hello }}, {{ locals.checked }}, {{ locals.file }}</div>
        </go-plaid-scope>      
        <go-plaid-scope :init='{a: "123", b: "456", file: "three"}' v-slot="{ locals }">
         <div id="testObject">{{ locals.a }}, {{ locals.b }}, {{ locals.file }}</div>
        </go-plaid-scope>
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())

    const testArray: any = wrapper.find('#testArray')
    expect(testArray.text()).toEqual(`123, true, two`)
    const testObject: any = wrapper.find('#testObject')
    expect(testObject.text()).toEqual(`123, 456, three`)
  })
})
