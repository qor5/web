import Vue, { VueConstructor, VNode } from 'vue';
import { Core } from './core';

const app = document.getElementById('app');
if (!app) {
	throw new Error('#app required');
}

declare var window: any;

const vueOptions = {};
for (const registerComp of (window.__goplaidVueComponentRegisters || [])) {
	registerComp(Vue, vueOptions);
}

window.__goplaid = {};
window.__goplaid.portals = {};

const form = new FormData();

interface DynaCompData {
	current: VueConstructor | null;
}

Vue.component('GoPlaidPortal', {
	name: 'GoPlaidPortal',
	props: ['loaderFunc', 'visible', 'afterLoaded', 'portalName'],
	template: `
		<div class="go-plaid-portal" v-if="visible">
			<component :is="current"><slot></slot></component>
		</div>
	`,

	mounted() {
		const pn = this.$props.portalName;
		if (pn) {
			window.__goplaid.portals[pn] = this;
		}

		this.reload();
	},

	data(): DynaCompData {
		return {
			current: null,
		};
	},

	methods: {
		reload() {
			const rootChangeCurrent = (this.$root as any).changeCurrent;
			const core = new Core(form, rootChangeCurrent, this.changeCurrent);

			if (this.$slots.default) {
				this.current = core.componentByTemplate('<slot></slot>');
				return;
			}

			const ef = this.loaderFunc;
			if (!ef || !ef.id) {
				return;
			}
			const afterLoaded = this.afterLoaded;
			const self = this;
			core.fetchEvent(ef, {})
				.then((r) => {
					self.current = core.componentByTemplate(r.body, afterLoaded);
				});
		},
		changeCurrent(newView: any) {
			this.current = newView;
		},
	},
});

Vue.directive('init-context-vars', {
	inserted: (el, binding, vnode: VNode) => {
		const ctx = vnode.context!;
		if (!ctx) {
			throw new Error('v-init-context-vars set on node that have no context');
		}

		if (typeof binding.value !== 'object') {
			return;
		}

		Object.keys(binding.value).forEach((k) => {
			ctx.$set(ctx.$data.vars, k, binding.value[k]);
		});
	},
});

const vm = new Vue({
	...{
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

		data(): DynaCompData {
			return {
				current: null,
			};
		},
	},
	...vueOptions,
});

vm.$mount('#app');
