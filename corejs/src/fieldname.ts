import {VNode} from "vue";
import {DirectiveBinding} from "vue/types/options";
import {setFormValue} from "@/utils";


export function fieldNameDirective(form: FormData) {

	function setListeners(el: any, vnode: VNode, localForm: FormData | null, fieldName: string) {
		const myform = localForm || form;
		if (vnode.componentInstance) {
			const comp = vnode.componentInstance

			// console.log("vnode.componentInstance",
			// 	comp.$props["inputValue"],
			// 	comp.$attrs["inputValue"],
			// 	comp.$props["value"],
			// 	comp.$attrs["value"]
			// 	)

			const value = comp.$props["inputValue"] ??
				comp.$attrs["inputValue"] ??
				comp.$props["value"] ??
				comp.$attrs["value"]
			setFormValue(myform, fieldName, value)
			if (el.__fieldNameOninput) {
				vnode.componentInstance.$off("change", el.__fieldNameOninput)
				vnode.componentInstance.$off("input", el.__fieldNameOninput)
			}
			el.__fieldNameOninput = (values: any) => {
				(myform as any).dirty = setFormValue(myform, fieldName, values);
			}
			vnode.componentInstance.$on("change", el.__fieldNameOninput)
			vnode.componentInstance.$on("input", el.__fieldNameOninput)
		} else {
			setFormValue(myform, fieldName, el)
			el.oninput = (evt: Event) => {
				if (!evt.target) {
					return
				}
				(myform as any).dirty = setFormValue(myform, fieldName, evt)
			}
		}

		// console.log("After", inspectFormData(myform))

	}

	function inserted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		// console.log("inserted ===>")

		if (Array.isArray(binding.value)) {
			setListeners(el, vnode, binding.value[0], binding.value[1])
			return
		}
		setListeners(el, vnode, null, binding.value)
	}

	// Update will trigger too much, and will update to null
	// function update(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
	// 	console.log("update ===>")
	// 	inserted(el, binding, vnode)
	// }

	return {
		inserted,
		// update: inserted,
	}
}



