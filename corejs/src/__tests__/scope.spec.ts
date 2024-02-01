import { describe, it, expect } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick } from 'vue'

describe('scope', () => {
  it('vars and form', async () => {
    const wrapper = mountTemplate(`
				<div>
				<go-plaid-scope :init='{hello: "123"}' v-slot="{locals: vars}">
					<div id="l1">{{ vars.hello }}</div>
					<button id="l1Btn" @click='vars.hello = "456"'></button>
					<go-plaid-scope :init='{hello: "789"}' v-slot="{locals}">
						<div id="l2">{{ locals.hello }}</div>
						<button id="l2Btn" @click='locals.hello = "999"'></button>

						<go-plaid-scope v-slot="{plaidForm}">
							<div id="l3">{{ plaidForm.get("Name") }}</div>
							<input type="text" v-field-name='[plaidForm, "Name"]'
								   value="AAA">
							<button id="l3Btn"
									@click='locals.hello = plaidForm.get("Name")'></button>

							<go-plaid-scope v-slot="{plaidForm}">
								<div id="l4">{{ plaidForm.get("Name") }}</div>
								<input id="input4" type="text"
									   v-field-name='[plaidForm, "Name"]'
									   value="BBB">

							</go-plaid-scope>

						</go-plaid-scope>

					</go-plaid-scope>
				</go-plaid-scope>
				<div class="globalForm">{{plaidForm.get("Name")}}</div>
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
  })
})
