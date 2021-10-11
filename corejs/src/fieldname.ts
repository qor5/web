import {VNode, VNodeDirective} from "vue";
import {DirectiveBinding} from "vue/types/options";
import {setFormValue} from "@/utils";

export function fieldNameDirective(formElems: Map<string, any>) {
	function setListeners(el: any, vnode: VNode, fieldName: string) {
        if (vnode.componentInstance) {
            const comp = vnode.componentInstance

            // console.log("vnode.componentInstance",
            // 	comp.$props["inputValue"],
            // 	comp.$attrs["inputValue"],
            // 	comp.$props["value"],
            // 	comp.$attrs["value"]
            // 	)

            const value = comp.$props["inputValue"] ||
                comp.$attrs["inputValue"] ||
                comp.$props["value"] ||
                comp.$attrs["value"]
            formElems.set(fieldName, {
                value: value
            })

            if (el.__fieldNameOninput) {
                vnode.componentInstance.$off("change", el.__fieldNameOninput)
                vnode.componentInstance.$off("input", el.__fieldNameOninput)
            }
            el.__fieldNameOninput = (values: any) => {
                formElems.set(fieldName, {
                    value: values
                })
            }
            vnode.componentInstance.$on("change", el.__fieldNameOninput)
            vnode.componentInstance.$on("input", el.__fieldNameOninput)
        } else {
            formElems.set(fieldName, {
                el: el,
            })
        }
	}

	function inserted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
		setListeners(el, vnode, binding.value)
	}

	return {
		inserted,
	}
}



