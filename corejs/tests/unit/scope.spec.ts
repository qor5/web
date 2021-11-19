import {mount,} from "@vue/test-utils";
import GoPlaidScope from "@/scope";
import {fieldNameDirective} from "@/fieldname";

describe('scope', () => {
	it('vars and form', async () => {

		const form = new FormData()
		const Root = {
			components: {
				"go-plaid-scope": GoPlaidScope,
			},

			directives: {
				"field-name": fieldNameDirective(form)
			},

			template: `
				<div>
				<go-plaid-scope :init='{hello: "123"}' v-slot="{locals: vars}">
					<div id="l1">{{ vars.hello }}</div>
					<button id="l1Btn" @click='vars.hello = "456"'></button>
					<go-plaid-scope :init='{hello: "789"}' v-slot="{locals}">
						<div id="l2">{{ locals.hello }}</div>
						<button id="l2Btn" @click='locals.hello = "999"'></button>

						<go-plaid-scope v-slot="{plaidForm}">
							<div id="l3">{{ plaidForm.get("Name") }}</div>
							<input type="text" v-field-name='[plaidForm, "Name"]' value="AAA">
							<button id="l3Btn" @click='locals.hello = plaidForm.get("Name")'></button>
						</go-plaid-scope>

					</go-plaid-scope>
				</go-plaid-scope>
				</div>
			`,
		}


		const wrapper = await mount(Root)
		console.log(wrapper.html())

		const btn: any = wrapper.find("#l1Btn")
		await btn.trigger("click")
		const l1: any = wrapper.find("#l1")
		expect(l1.text()).toEqual(`456`);

		const btn2: any = wrapper.find("#l2Btn")
		await btn2.trigger("click")
		const l2: any = wrapper.find("#l2")
		expect(l2.text()).toEqual(`999`);

		const btn3: any = wrapper.find("#l3Btn")
		await btn3.trigger("click")
		const l3: any = wrapper.find("#l3")
		expect(l2.text()).toEqual(`AAA`);
		expect(l3.text()).toEqual(`AAA`);

	})

})
