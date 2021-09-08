import {mount} from "@vue/test-utils";
import {initContext} from "@/initContext";

describe('init-context', () => {
	it('with vars', async () => {

		const Text1 = {
			directives: {
				"init-context": initContext(),
			},
			template: `
				<div v-init-context:vars="{a: 1, b:2}">
					<span :a="vars.a"></span>
				</div>
			`,
			methods: {
				change2: function() {
					this.vars.a = 3
				}
			},

			data() {
				return {
					vars: {c: "2"}
				}
			}
		}

		const wrapper = await mount(Text1)
		await wrapper.vm.change2()
		const span = wrapper.find("span")
		expect(span.attributes("a")).toEqual(`3`);

	})

})
