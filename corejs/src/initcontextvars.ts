import {VNode, VNodeDirective} from "vue";

export function initContextVars() {
	return {
		inserted: (el: HTMLElement, binding: VNodeDirective, vnode: VNode) => {
			const ctx: any = vnode.context;
			if (!ctx) {
				throw new Error('v-init-context-vars set on node that have no context');
			}

			if (typeof binding.value !== 'object') {
				return;
			}

			Object.keys(binding.value).forEach((k) => {
				if (ctx.vars.hasOwnProperty(k)) {
					return
					// throw new Error(`v-init-context-vars '${k}' already exists in ${JSON.stringify(ctx.vars)}, use a different key.`);
				}
				ctx.$set(ctx.vars, k, binding.value[k]);
			});
		},
	}
}
