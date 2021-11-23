import Vue from "vue";
import {GoPlaidPortal} from "@/portal";
import GoPlaidScope from "@/scope";
import {initContext} from "@/initContext";
import {fieldNameDirective} from "@/fieldname";
import debounce from "@/debounce";
import {keepScroll} from "@/keepScroll";
import {Builder, plaid} from "@/builder";

const form = new FormData();

Vue.component('GoPlaidPortal', GoPlaidPortal());
Vue.component('GoPlaidScope', GoPlaidScope);
Vue.directive('init-context', initContext());
Vue.directive('field-name', fieldNameDirective(form));
Vue.directive('debounce', debounce);
Vue.directive('keep-scroll', keepScroll());

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
			plaidForm: form,
		};
	},
	methods: {
		$plaid: function (): Builder {
			return plaid().vueContext(this).form(form).vars((this as any).vars)
		}
	}
})
