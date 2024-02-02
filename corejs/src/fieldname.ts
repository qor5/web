import type { Directive, DirectiveBinding, VNode } from 'vue'
import { registerEvent, setFormValue } from '@/utils'

export function fieldNameDirective(): Directive {
  function mounted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
    const [form, fieldName] = binding.value

    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      setFormValue(form, fieldName, el)
    } else {
      const vnodeCtx = (vnode as any).ctx
      setFormValue(form, fieldName, vnode.props?.value ?? vnodeCtx.props?.modelValue)
    }
    const anyEl: any = el
    anyEl._cancelChange && anyEl._cancelChange()
    anyEl._cancelInput && anyEl._cancelInput()
    anyEl._cancelChange = registerEvent(
      el,
      'change',
      (values: any) => {
        ;(form as any).dirty = setFormValue(form, fieldName, values)
      },
      {}
    )

    anyEl._cancelInput = registerEvent(
      el,
      'input',
      (values: any) => {
        ;(form as any).dirty = setFormValue(form, fieldName, values)
      },
      {}
    )
  }

  function unmounted(el: HTMLElement, binding: DirectiveBinding, vnode: VNode) {
    const anyEl: any = el
    anyEl._cancelChange && anyEl._cancelChange()
    anyEl._cancelInput && anyEl._cancelInput()
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
