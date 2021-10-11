import Vue from 'vue';
import {fieldNameDirective} from "@/fieldname";
import {DynaCompData, GoPlaidPortal} from "@/portal";
import {initContext} from "@/initContext";
import {Builder, plaid} from "@/builder";
import {componentByTemplate,setFormValues} from "@/utils";
import {debounce, throttle} from "lodash";

const app = document.getElementById('app');
if (!app) {
	throw new Error('#app required');
}

declare var window: any;

const vueOptions = {};
for (const registerComp of (window.__goplaidVueComponentRegisters || [])) {
	registerComp(Vue, vueOptions);
}

const formElems = new Map();
const debouncedFetch = debounce(fetch, 500, {leading: false, trailing: true, maxWait: 1000})

Vue.component('GoPlaidPortal', GoPlaidPortal());
Vue.directive('init-context', initContext());
Vue.directive('field-name', fieldNameDirective(formElems));

Vue.mixin({
	mounted() {
		window.addEventListener('fetchStart', (e: Event) => {
			(this as any).isFetching = true;
		});
		window.addEventListener('fetchEnd', (e: Event) => {
			(this as any).isFetching = false;
		});
	},
	data() {
		return {
			isFetching: false,
		};
	},
	methods: {
		$plaid: function (): Builder {
            const form = new FormData();
            setFormValues(form, formElems)

			return plaid().
				debounceFetch(debouncedFetch).
				vueContext(this).
				form(form).
				vars((this as any).vars)
		}
	}
})

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
			this.current = componentByTemplate(app.innerHTML)
			window.onpopstate = (evt: any) => {
				(this as any).$plaid().onpopstate(evt);
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
