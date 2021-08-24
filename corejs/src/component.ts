import Vue, {CreateElement, RenderContext, VNode, VNodeDirective, VueConstructor} from 'vue';
import {jsonEvent, setFormValue} from "@/utils";
import {DirectiveBinding} from "vue/types/options";
import {create} from "lodash";
import {EventFuncID, EventResponse} from "@/types";

export interface DynaCompData {
	current: VueConstructor | null;
}

export function componentByTemplate(template: string, data?: object, provide?: object, inject?: string[]): VueConstructor {
	let options: any = {
		template: '<div>' + template + '</div>', // to make only one root.
	}

	if(provide) {
		options.provide = provide
	}

	if(inject) {
		options.inject = inject
	}

	if(data) {
		options.data = function() {
			return data
		}
		console.log("options.data", options.data())
	}


	return Vue.extend(options);
}

export let DynaComponent = Vue.extend({
	name: 'GoPlaidDynaComponent',
	props: ['data', 'provide', 'inject'],


	mounted() {
		// if (this.$slots.default) {
		// 	this.current = componentByTemplate('<slot></slot>',
		// 		this.$props.data,
		// 		this.$props.provide,
		// 		this.$props.inject);
		// 	return;
		// }
	},

	render(createElement: CreateElement, hack: RenderContext): VNode {
		return createElement("h1", "Hello world")
	},

	data(): DynaCompData {
		return {
			current: null,
		}
	},

})



export function mixin() {

	function loadPage(pushState: any, debouncedWait?: number): Promise<EventResponse> {
		let f = self.loadPage;
		if (debouncedWait) {
			f = debounce(loadPage, debouncedWait)
		}
		return f.apply(self, [pushState]);
	},

	function triggerEventFunc(eventFuncId: EventFuncID,
		evt: any,
		pageURL?: string,
		debouncedWait?: number,
		fieldName?: string,
		vars?: any,
): Promise<EventResponse> {
		if (fieldName) {
			setFormValue(self.form, fieldName, evt)
		}
		let f = self.fetchEventThenRefresh;
		if (debouncedWait) {
			f = debounce(this.fetchEventThenRefresh, debouncedWait)
		}
		return f.apply(self, [eventFuncId, jsonEvent(evt), false, pageURL, vars]);
	},
		setFormValue(fieldName: string, val: any) {
		setFormValue(self.form, fieldName, val)
	}


	return {
		inserted,
	}
}
