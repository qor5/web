import {VNode, VNodeDirective} from "vue";
import {DirectiveBinding} from "vue/types/options";
import {setFormValue} from "@/utils";


export function fieldNameDirective(form: FormData) {

	function setListeners(el: HTMLElement, vnode: VNode, fieldName: string) {
		if (vnode.componentInstance) {
			const comp = vnode.componentInstance

			// console.log("vnode.componentInstance",
			// 	comp.$props["inputValue"],
			// 	comp.$attrs["inputValue"],
			// 	comp.$props["value"],
			// 	comp.$attrs["value"]
			// 	)
			setFormValue(form, fieldName,
				comp.$props["inputValue"] ||
				comp.$attrs["inputValue"] ||
				comp.$props["value"] ||
				comp.$attrs["value"]
			)
			if (el.onchange) {
				vnode.componentInstance.$off("change", el.onchange)
			}
			el.onchange = (values: any) => {
				setFormValue(form, fieldName, values);
				// comp.$emit("fieldChange")
			}
			vnode.componentInstance.$on("change", el.onchange)
		} else {
			setFormValue(form, fieldName, el)
			el.oninput = (evt: Event) => {
				if (!evt.target) {
					return
				}
				setFormValue(form, fieldName, evt)
			}
		}
	}

	function inserted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		setListeners(el, vnode, binding.value)
	}

	function update(el: HTMLElement, binding: VNodeDirective, vnode: VNode) {
		setListeners(el, vnode, binding.value)
	}

	return {
		inserted,
		update,
	}
}



