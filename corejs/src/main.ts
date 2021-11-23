import Vue from 'vue';
import {DynaCompData} from "@/portal";
import {componentByTemplate} from "@/utils";
import "@/setup"

const app = document.getElementById('app');
if (!app) {
	throw new Error('#app required');
}

declare var window: any;

const vueOptions = {};
for (const registerComp of (window.__goplaidVueComponentRegisters || [])) {
	registerComp(Vue, vueOptions);
}

const vm = new Vue({
	...{

		provide: {
			vars: Vue.observable({}),
		},

		template: `
			<div id="app" v-cloak>
			<component :is="current"></component>
			</div>
		`,

		mounted() {
			this.current = componentByTemplate(app.innerHTML, (this as any).plaidForm)
			window.onpopstate = (evt: any) => {
				if (evt && evt.state != null) {
					(this as any).$plaid().onpopstate(evt);
				}
			};
		},

		data(): DynaCompData {
			return {
				current: null,
			};
		},

	},
	...vueOptions,
});

vm.$mount('#app');
