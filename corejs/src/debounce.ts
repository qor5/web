import debounce from 'lodash/debounce'
import type { DirectiveBinding, ObjectDirective } from 'vue'

// Attach directive to element and wait for input to stop. Default timeout 800ms or 0.8s.
const debounceDirective: ObjectDirective<HTMLElement> = {
  mounted(el, binding) {
    const evt = binding.arg || 'input'

    ;(el as any).debounceFunc = debounce(
      function (e: Event) {
        // Emit an event from the directive. This requires handling in the parent component.
        let customEvent = createNewEvent(evt + ':debounced')
        el.dispatchEvent(customEvent)
      },
      parseInt(binding.value) || 800
    )

    if (binding.value !== binding.oldValue) {
      el.addEventListener(evt, (el as any).debounceFunc)
    }
  },
  beforeUnmount(el, binding) {
    const evt = binding.arg || 'input'
    el.removeEventListener(evt, binding.oldValue)
  }
}

// IE Support
function createNewEvent(eventName: string) {
  var e: Event
  if (typeof Event === 'function') {
    e = new Event(eventName, { bubbles: true, cancelable: true })
  } else {
    e = document.createEvent('Event')
    e.initEvent(eventName, true, true)
  }
  return e
}

export default debounceDirective
