import {mount, } from "@vue/test-utils";
import Vue from 'vue';
import {componentByTemplate, dataMixins, DynaComponent} from "@/component";
import {initContextVars} from "@/initcontextvars";

describe('provide', () => {
	it('provide and inject', async () => {


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
			props: {
				vars: Object,
			},

			mounted() {
				console.log("this.$props.vars", this.$props.vars)
			},
			template: `
				<div class="son" v-bind:value="vars.root"></div>
			`,

			methods: {
				change() {
					console.log("changed")
					// @ts-ignore
					this.vars.root = "123456"
				}
			},
		})

		Vue.component("dyna", DynaComponent)
		Vue.component("son", Son)
		Vue.component("father", Father)
		Vue.directive("init-context-vars", initContextVars())



		const template = `
				<dyna :provide='{vars: {root: "123"}}'>
					<div :value="hello"></div>
				</dyna>
`;

		const compiledTemplate = Vue.compile(template);


		const Root = {
			render(createElement: any) {
				// console.log("this", this)
				return compiledTemplate.render.call(
					Object.assign(this, {
						data() {
							return {
								vars: {},
								hello: "123"
							}
						}}),
					createElement)
			}
		}

		// 	<dyna :inject='["vars"]'>
		// <div class="p1" v-init-context-vars='{value2: "333"}'>
		// 	<son :vars="vars"></son>
		// 	<div :value="vars.root"></div>
		// 	<dyna class="p2">
		// <div class="p3" :value="vars.value2" v-init-context-vars='{value3: "444"}' ></div>
		// 	</dyna>
		//
		// 	<dyna class="p4" :template="vars.value2" :value="vars.value2">
		// <div class="p4" :value="vars.value2" ></div>
		// 	</dyna>
		// 	</div>
		// 	</dyna>

		const wrapper = await mount(Root)
		console.log(wrapper.html(), wrapper.vm.$data)


		let son: any = wrapper.find(".son").vm
		await son.change()
		console.log(wrapper.html())


	})

})
