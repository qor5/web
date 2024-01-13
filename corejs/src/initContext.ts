import type {VNode, DirectiveBinding, Directive} from "vue";

export function initContext(): Directive {
	return {
		created: (el: HTMLElement, binding: DirectiveBinding, vnode: VNode) => {
			var arg = binding.arg || "vars"
			const ctx: any = vnode.component?.proxy;
			if (!ctx) {
				throw new Error('v-init-context:vars set on node that have no context');
			}

			if (typeof binding.value !== 'object') {
				return;
			}

			Object.keys(binding.value).forEach((k) => {
				if (ctx[arg].hasOwnProperty(k)) {
					return
					// throw new Error(`v-init-context-vars '${k}' already exists in ${JSON.stringify(ctx.vars)}, use a different key.`);
				}
				ctx.$set(ctx[arg], k, binding.value[k]);
			});
		},
	}
}
