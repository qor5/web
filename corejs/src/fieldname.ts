import type {VNode, Directive, DirectiveBinding} from "vue";
import {setFormValue} from "@/utils";


interface ValueProps {
	inputValue?: string;
	value?: string;
}

export function fieldNameDirective(form: FormData) :Directive {

	function setListeners(el: any, vnode: VNode, localForm: FormData | null, fieldName: string) {
		const myform = localForm || form;
		const comp = vnode.component?.proxy
		if (comp) {
			const props = comp.$props as ValueProps;
			const attrs = comp.$attrs as ValueProps;

			const value = props.inputValue ??
				attrs.inputValue ??
				props.value ??
				attrs.value;
			// console.log("vnode.componentInstance",
			// 	comp.$props["inputValue"],
			// 	comp.$attrs["inputValue"],
			// 	comp.$props["value"],
			// 	comp.$attrs["value"]
			// 	)


			setFormValue(myform, fieldName, value)
			if (el.__fieldNameOninput) {
				el.removeEventListener("change", el.__fieldNameOninput)
				el.removeEventListener("input", el.__fieldNameOninput)
			}
			el.__fieldNameOninput = (values: any) => {
				(myform as any).dirty = setFormValue(myform, fieldName, values);
			}
			el.addEventListener("change", el.__fieldNameOninput)
			el.addEventListener("input", el.__fieldNameOninput)
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

	function created(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
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
		created,
		// update: inserted,
	}
}



