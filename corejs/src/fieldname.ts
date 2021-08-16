import {VNode, VNodeDirective} from "vue";
import {DirectiveBinding} from "vue/types/options";


export function fieldNameDirective(form: FormData) {
	let onInput: EventListener;

	function setValue(target: HTMLInputElement, fieldName: string) {
		// console.log("target.value", target.value, "target.type", target.type, "target.checked", target.checked, target.form)
		if (target.files) {
			form.delete(fieldName);
			for (const f of target.files) {
				form.append(fieldName, f, f.name);
			}
		} else if (target.type === 'checkbox') {
			if (target.checked) {
				form.set(fieldName, target.value);
			} else {
				form.delete(fieldName);
			}
		} else if (target.type === 'radio') {
			if (target.checked) {
				form.set(fieldName, target.value);
			}
		} else {
			form.set(fieldName, target.value);
		}
	}

	function inputEventHandler(fieldName: string): EventListener {
		return function (evt: Event) {
			if (!evt.target) {
				return
			}
			const target = evt.target as HTMLInputElement
			setValue(target, fieldName)
		}
	}

	function bind(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		// console.log("vnode.context", vnode.context)
		const fieldName = binding.value
		setValue(el as HTMLInputElement, fieldName)
		onInput = inputEventHandler(fieldName)
		el.addEventListener("input", onInput)

	}

	function unbind(el: HTMLElement) {
		el.removeEventListener("input", onInput)
	}

	function update(el: HTMLElement, binding: VNodeDirective) {
		el.removeEventListener("input", onInput)
		onInput = inputEventHandler(binding.value)
		el.addEventListener("input", onInput)
	}

	return {
		bind,
		unbind,
		update,
	}
}



