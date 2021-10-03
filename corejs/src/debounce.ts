import debounce from "lodash/debounce";
import {VNode, VNodeDirective} from "vue";

// Attach directive to element and wait for input to stop. Default timeout 800ms or 0.8s.
export default function (el: HTMLElement, binding: VNodeDirective, vnode: VNode) {
	const evt = binding.arg || "input"

	const fire = debounce(function (e) {
		if (vnode.componentInstance) {
			vnode.componentInstance.$emit(evt+":debounced", e)
		} else {
			el.dispatchEvent(createNewEvent(evt +':debounced'))
		}
	}, parseInt(binding.value) || 800)

	if (binding.value !== binding.oldValue) {
		if (vnode.componentInstance) {
			vnode.componentInstance.$on(evt, fire)
		} else {
			(el as any)["on"+evt] = fire
		}
	}
}

// IE Support
function createNewEvent(eventName: string) {
	var e: Event
	if (typeof(Event) === 'function') {
		e = new Event(eventName, {bubbles: true, cancelable: true})
	} else {
		e = document.createEvent('Event')
		e.initEvent(eventName, true, true)
	}
	return e
}
