import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick } from 'vue'

describe('syncer', () => {
  it('syncer', async () => {
    const wrapper = mountTemplate(`
            <go-plaid-scope :init="{hello:'123'}" v-slot="{ locals: alocals }">
            <go-plaid-syncer :model="alocals" uniqueId="_xxxx_" />
            <button id="btn1" @click='alocals.hello = "666";' />
            <div id="txt1">{{ alocals.hello }}</div>
            </go-plaid-scope>
            <go-plaid-scope :init="{hello:'123'}" v-slot="{ locals: blocals }">
            <go-plaid-syncer :model="blocals" uniqueId="_xxxx_" />
            <button id="btn2" @click='blocals.hello = "888";' />
            <div id="txt2">{{ blocals.hello }}</div>
            </go-plaid-scope>
        `)
    await nextTick()
    console.log(wrapper.html())

    const txt1: any = wrapper.find('#txt1')
    const txt2: any = wrapper.find('#txt2')
    expect(txt1.text()).toEqual(`123`)
    expect(txt2.text()).toEqual(`123`)

    const btn1: any = wrapper.find('#btn1')
    const btn2: any = wrapper.find('#btn2')

    await btn1.trigger('click')
    expect(txt1.text()).toEqual(`666`)
    expect(txt2.text()).toEqual(`666`)

    await btn2.trigger('click')
    expect(txt2.text()).toEqual(`888`)
    expect(txt1.text()).toEqual(`888`)
  })
})
