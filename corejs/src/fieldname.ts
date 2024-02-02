import type { Directive, DirectiveBinding, VNode } from 'vue'
import { registerEvent, setFormValue } from '@/utils'

export function fieldNameDirective(form: FormData): Directive {
  let cancelChange: any
  let cancelInput: any

  function mounted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
    let myform = form
    let fieldName = binding.value
    if (Array.isArray(binding.value)) {
      myform = binding.value[0] ?? form
      fieldName = binding.value[1]
    }

    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      setFormValue(myform, fieldName, el)
    } else {
      setFormValue(myform, fieldName, vnode.props?.value)
    }

    cancelChange && cancelChange()
    cancelInput && cancelInput()
    cancelChange = registerEvent(
      el,
      'change',
      (values: any) => {
        ;(myform as any).dirty = setFormValue(myform, fieldName, values)
      },
      {}
    )

    cancelInput = registerEvent(
      el,
      'input',
      (values: any) => {
        ;(myform as any).dirty = setFormValue(myform, fieldName, values)
      },
      {}
    )
  }

  function unmounted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
    cancelChange && cancelChange()
    cancelInput && cancelInput()
  }

  // Update will trigger too much, and will update to null
  // function update(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
  // 	console.log("update ===>")
  // 	inserted(el, binding, vnode)
  // }
  return {
    mounted,
    unmounted
    // update: inserted,
  }
}
