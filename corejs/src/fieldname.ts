import {VNode, VNodeDirective} from "vue";
import {DirectiveBinding} from "vue/types/options";
import {setFormValue} from "@/utils";


export function fieldNameDirective(form: FormData) {
	let onInput: EventListener
	let onComponentInput: Function

	function setValue(target: HTMLInputElement, fieldName: string) {
		// console.log("target.value", target.value, "target.type", target.type, "target.checked", target.checked, target.form)
		if (target.files) {
			form.delete(fieldName)
			for (const f of target.files) {
				form.append(fieldName, f, f.name)
			}
		} else if (target.type === 'checkbox') {
			if (target.checked) {
				form.set(fieldName, target.value)
			} else {
				form.delete(fieldName)
			}
		} else if (target.type === 'radio') {
			if (target.checked) {
				form.set(fieldName, target.value)
			}
		} else {
			form.set(fieldName, target.value)
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


	function removeListeners(el: HTMLElement, vnode: VNode) {
		if (vnode.componentInstance) {
			const comp = vnode.componentInstance
			if(onComponentInput) {
				comp.$off("input", onComponentInput)
			}
		} else {
			if(onInput) {
				el.removeEventListener("input", onInput)
			}
		}
	}

	function setListeners(el: HTMLElement, vnode: VNode, fieldName: string) {
		if (vnode.componentInstance) {
			const comp = vnode.componentInstance
			if(onComponentInput) {
				comp.$off("input", onComponentInput)
			}
			setFormValue(form, fieldName, comp.$attrs["input-value"] || comp.$attrs["value"])
			onComponentInput = (values: any) => {
				setFormValue(form, fieldName, values);
			}
			vnode.componentInstance.$on("input", onComponentInput)
		} else {
			if(onInput) {
				el.removeEventListener("input", onInput)
			}
			setValue(el as HTMLInputElement, fieldName)
			onInput = inputEventHandler(fieldName)
			el.addEventListener("input", onInput)
		}
	}

	function inserted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		setListeners(el, vnode, binding.value)
	}

	function update(el: HTMLElement, binding: VNodeDirective, vnode: VNode) {
		setListeners(el, vnode, binding.value)
	}

	function unbind(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		removeListeners(el, vnode)
	}
	return {
		inserted,
		unbind,
		update,
	}
}



