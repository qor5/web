import {mount, } from "@vue/test-utils";
import {GoPlaidPortal} from "@/portal";
import Vue from 'vue';
import {initContextVars} from "@/initcontextvars";

describe('portal', () => {
	it('vars', async () => {

		let form = new FormData()
		const portal = GoPlaidPortal(form)


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
			directives: {
				"init-context-vars": initContextVars(),
			},
			components: {
				"portal": portal,
				"son": Son,
			},

			template: `
				<div>
					<son></son>
					<portal :visible="true">
						<input type="text" v-init-context-vars='{value: "222"}' />
					</portal>
				</div>
			`,
			methods: {
				change2: function(val: any) {
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
			directives: {
				"init-context-vars": initContextVars(),
			},


			template: `
				<div v-init-context-vars='{value: "222"}'>
					<input type="text" v-init-context-vars='{value: "333"}' />
				</div>
			`,
			methods: {
				change2: function(val: any) {
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
})
