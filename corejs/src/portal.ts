import Vue, {VueConstructor} from 'vue';
import {componentByTemplate} from "@/utils";
import {EventResponse} from "@/types";

declare var window: any;
window.__goplaid = {};
window.__goplaid.portals = {};

export interface DynaCompData {
	current: VueConstructor | null;
	autoReloadIntervalID?: number;
}

export function GoPlaidPortal() {
	return Vue.extend({
		inject: ['vars'],
		name: 'GoPlaidPortal',
		props: ['loader', 'portalForm', 'visible', 'afterLoaded', 'portalName', "autoReloadInterval"],
		template: `
			<div class="go-plaid-portal" v-if="visible">
			<component :is="current" v-if="current">
				<slot></slot>
			</component>
			</div>
		`,

		mounted() {
			const pn = this.$props.portalName;
			if (pn) {
				window.__goplaid.portals[pn] = this;
			}

			this.reload();
		},

		updated() {
			if (this.$props.autoReloadInterval && this.autoReloadIntervalID == 0) {
				const interval = parseInt(this.$props.autoReloadInterval)
				if (interval == 0) {
					return
				}

				this.autoReloadIntervalID = setInterval(() => {
					this.reload()
				}, interval);

			}


			if (this.autoReloadIntervalID && this.autoReloadIntervalID > 0 &&
				this.$props.autoReloadInterval == 0) {
				clearInterval(this.autoReloadIntervalID)
				this.autoReloadIntervalID = 0
			}
		},

		data(): DynaCompData {
			return {
				current: null,
				autoReloadIntervalID: 0,
			};
		},

		beforeDestroy() {
			if (this.autoReloadIntervalID && this.autoReloadIntervalID > 0) {
				clearInterval(this.autoReloadIntervalID)
			}
		},

		methods: {
			reload() {
				// const rootChangeCurrent = (this.$root as any).changeCurrent;
				// const core = new Core(form, rootChangeCurrent, this.changeCurrent);

				if (this.$slots.default) {
					this.current = componentByTemplate('<slot></slot>', this.portalForm);
					return;
				}

				const ef = this.loader;
				if (!ef) {
					return;
				}
				const self = this;
				ef.vars((this as any).vars).go().then((r: EventResponse) => {
					self.current = componentByTemplate(r.body, this.portalForm);
				});
			},
			changeCurrentTemplate(template: string) {
				this.changeCurrent(componentByTemplate(template, this.portalForm));
			},
			changeCurrent(newView: any) {
				this.current = newView;
			}
		},
	})
}

