import Vue, { VueConstructor, VNode } from 'vue';
import { Core } from '@/core';
import {fieldNameDirective} from "@/fieldname";
import {GoPlaidPortal} from "@/portal";
import {initContextVars} from "@/initcontextvars";

const app = document.getElementById('app');
if (!app) {
	throw new Error('#app required');
}

declare var window: any;

const vueOptions = {};
for (const registerComp of (window.__goplaidVueComponentRegisters || [])) {
	registerComp(Vue, vueOptions);
}

const form = new FormData();

Vue.component('GoPlaidPortal', GoPlaidPortal(form));
Vue.directive('init-context-vars', initContextVars());
Vue.directive('field-name', fieldNameDirective(form));

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

		methods: {
			changeCurrent(newView: any) {
				this.current = newView;
			},
		},

		mounted() {
			const core = new Core(form, this.changeCurrent, this.changeCurrent);
			this.changeCurrent(core.componentByTemplate(app.innerHTML));
			window.onpopstate = (evt: any) => {
				core.onpopstate(evt);
			};
		},

		data() {
			return {
				current: null,
			};
		},

	},
	...vueOptions,
});

vm.$mount('#app');
