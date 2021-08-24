import {mount, } from "@vue/test-utils";
import Vue from 'vue';
import {componentByTemplate, dataMixins, DynaComponent} from "@/component";
import {initContextVars} from "@/initcontextvars";
import {fetchEvent} from "@/utils";

describe('fetch', () => {
	it('triggerEventFunc', async () => {
		const form = new FormData()
		global.fetch = jest.fn((): Promise<any> => {
			return Promise.resolve({
				json: () => Promise.resolve({ pageTitle: "Hello World" }),
			})
		})

		const r = await fetchEvent({id: "hello"}, {}, form)
		console.log("r", r)
		expect(fetch).toHaveBeenCalledWith(
			"/?__execute_event__=hello",
			{"body": form, "method": "POST"},
		);

		expect(form.get("__event_data__")).toEqual(JSON.stringify({
			"eventFuncId": {
				"id": "hello",
				"pushState": null,
			},
			"event": {},
		}))

		expect(document.title).toEqual("Hello World")


		Vue.prototype.trigger1 = function (evt: any) {
			console.log("evt", evt)
		}

		const Root = {
			template: `
				<div>
					<input type="text" @input="trigger1($event)" />
				</div>
			`
		}


		const wrapper = await mount(Root)
		console.log(wrapper.html(), wrapper.vm.$data)


		let input: any = wrapper.find("input")
		await input.setValue("hello")
		console.log(wrapper.html())


	})

})
