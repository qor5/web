import Vue from 'vue';
import {mount,} from "@vue/test-utils";
import {GoPlaidPortal} from "@/portal";
import GoPlaidScope from "@/scope";
// @ts-ignore
import plaidFormTest from "./plaidFormTest";
import "@/setup"
import {inspectFormData} from "@/utils";

describe('portal', () => {
	it('vars', async () => {

		const portal = GoPlaidPortal()


		const Father = Vue.extend({
			inject: ["vars"],
			template: `
				<div class="father" :value="vars.value"></div>
			`,
			methods: {
				change() {
					console.log("changed")
					// @ts-ignore
					this.vars.value = "123456"
				}
			},

		})

		const Son = Vue.extend({
			inject: ["vars"],
			created() {
				// @ts-ignore
				console.log("vars.value", this.vars.value)
			},

			template: `
				<div class="son" v-bind:value="vars.value"></div>
			`,
			methods: {
				change() {
					console.log("changed")
					// @ts-ignore
					this.vars.value = "son changed"
				}
			},

		})

		const Root = {

			components: {
				"son": Son,
			},

			template: `
				<div>
				<son></son>
				<go-plaid-portal :visible="true">
					<input type="text" v-init-context:vars='{value: "222"}'/>
				</go-plaid-portal>
				</div>
			`,
			methods: {
				change2: function (val: any) {
					console.log("change2", val)
				}
			},

			data() {
				return {
					vars: {},
				}
			},

			provide(): any {
				return {
					// @ts-ignore
					vars: this.vars,
				}
			},
		}


		const wrapper = await mount(Root)
		console.log(wrapper.html())

		const portalComp: any = wrapper.find(".go-plaid-portal")
		await portalComp.vm.changeCurrent(Father)

		const father: any = wrapper.find(".father")
		expect(father.attributes("value")).toEqual(`222`);

		await father.vm.change()
		console.log(wrapper.html())

		const son: any = wrapper.find(".son")
		expect(son.attributes("value")).toEqual(`123456`);

	})

	it('vars error', async () => {


		const Root = {

			template: `
				<div v-init-context:vars='{value: "222"}'>
				<input type="text" v-init-context:vars='{value: "333"}'/>
				</div>
			`,
			methods: {
				change2: function (val: any) {
					console.log("change2", val)
				}
			},

			data() {
				return {
					vars: {},
				}
			},

			provide(): any {
				return {
					// @ts-ignore
					vars: this.vars,
				}
			},
		}


		expect((mount(Root).vm as any).vars["value"]).toEqual("333")
	})

	it('plaidForm', async () => {
		const wrapper = await mount(plaidFormTest)
		console.log(wrapper.html())

		const portalComp: any = wrapper.find(".go-plaid-portal")
		await portalComp.vm.changeCurrentTemplate(`
<input from="server" type="text" :value='555' v-field-name='[plaidForm, "Name"]'/>
`)

		console.log(wrapper.html())
		const scope: any = wrapper.findComponent(GoPlaidScope)
		console.log(inspectFormData(scope.vm.plaidForm))
		expect(scope.vm.plaidForm.get("Name")).toEqual("555")

	})
})
