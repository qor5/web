import { createApp, reactive } from 'vue'
import type {DynaCompData} from "@/portal";
import {componentByTemplate} from "@/utils";
import "@/setup"

const app = document.getElementById('app');
if (!app) {
	throw new Error('#app required');
}

declare var window: any;

const vueOptions = {};

const vm = createApp({
	...{

		provide: {
			vars: reactive({}),
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

for (const registerComp of (window.__goplaidVueComponentRegisters || [])) {
	registerComp(vm, vueOptions);
}

vm.mount('#app');
