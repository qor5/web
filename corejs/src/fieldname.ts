import type { VNode, Directive, DirectiveBinding } from 'vue'
import { setFormValue } from '@/utils'

interface ValueProps {
  modelValue?: string
  value?: string
}

function setListeners(el: any, vnode: VNode, myform: FormData, fieldName: string) {
  const comp = (vnode as any).ctx
  // console.log("vnode",el, vnode)
  //console.log('vnode', vnode, 'el', el)
  // if (comp) {
  const props = vnode.props as ValueProps
  // const attrs = comp.attrs as ValueProps

  // const value = props.modelValue ?? attrs.modelValue ?? props.value ?? attrs.value
  // console.log('vnode.component', props.modelValue, attrs.modelValue, props.value, attrs.value)

  setFormValue(myform, fieldName, props.value)
  if (el.__fieldNameOninput) {
    el.removeEventListener('change', el.__fieldNameOninput)
    el.removeEventListener('input', el.__fieldNameOninput)
  }
  el.__fieldNameOninput = (values: any) => {
    ;(myform as any).dirty = setFormValue(myform, fieldName, values)
  }
  el.addEventListener('change', el.__fieldNameOninput)
  el.addEventListener('input', el.__fieldNameOninput)
  // } else {
  //   setFormValue(myform, fieldName, el)
  //   el.oninput = (evt: Event) => {
  //     if (!evt.target) {
  //       return
  //     }
  //     ;(myform as any).dirty = setFormValue(myform, fieldName, evt)
  //   }
  // }

  // console.log("After", inspectFormData(myform))
}

export function fieldNameDirective(form: FormData): Directive {
  function mounted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
    if (Array.isArray(binding.value)) {
      setListeners(el, vnode, binding.value[0] ?? form, binding.value[1])
      return
    }
    setListeners(el, vnode, form, binding.value)
  }

  // Update will trigger too much, and will update to null
  // function update(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
  // 	console.log("update ===>")
  // 	inserted(el, binding, vnode)
  // }
  return {
    mounted
    // update: inserted,
  }
}
