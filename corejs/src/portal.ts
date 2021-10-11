import Vue, {VueConstructor} from 'vue';
import {componentByTemplate} from "@/utils";
import {EventResponse} from "@/types";
declare var window: any;
window.__goplaid = {};
window.__goplaid.portals = {};

export interface DynaCompData {
	current: VueConstructor | null;
}

export function GoPlaidPortal() {
	return Vue.extend({
		name: 'GoPlaidPortal',
		props: ['loaderFunc', 'visible', 'afterLoaded', 'portalName'],
		template: `
		<div class="go-plaid-portal" v-if="visible">
			<component :is="current" v-if="current"><slot></slot></component>
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
				// const rootChangeCurrent = (this.$root as any).changeCurrent;
				// const core = new Core(form, rootChangeCurrent, this.changeCurrent);

				if (this.$slots.default) {
					this.current = componentByTemplate('<slot></slot>');
					return;
				}

				const ef = this.loaderFunc;
				if (!ef || !ef.id) {
					return;
				}
				const self = this;
				(this as any).$plaid().
					eventFuncID(ef).
					go().then((r: EventResponse) => {
						self.current = componentByTemplate(r.body);
					});
			},
			changeCurrent(newView: any) {
				this.current = newView;
			},
		},
	})
}

