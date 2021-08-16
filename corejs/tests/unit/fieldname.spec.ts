import {mount} from "@vue/test-utils";
import {fieldNameDirective} from "@/fieldname";

describe('field name', () => {
	it('update value in form', async () => {
		const form = new FormData()

		const BaseInput = {
			template: `
			<label class="base-input">
				{{ label }}
				<input
				v-bind="$attrs"
				v-bind:value="value"
				v-on:input="$emit('input', $event.target.value)"
				>
			</label>
			`,
			data() {
				return {  }
			},
			props: {
				label: String,
				value: String,
			}

		}

		const Text1 = {
			directives: {
				"field-name": fieldNameDirective(form),
			},
			components: {
				"base-input": BaseInput,
			},
			template: `
				<div>
					<textarea v-field-name='"Textarea1"'>textarea1 value</textarea>
					<input type="text" v-field-name='"Text1"'/>
					<input type="radio" v-field-name='"Radio1"' value="Radio1 checked value" checked/>
					<input type="radio" v-field-name='"Radio1"' value="Radio1 not checked value"/>
					<input type="hidden" v-field-name='"Hidden1"' value="hidden1value"/>
					<input type="checkbox" v-field-name='"Checkbox1"' value="checkbox checked value" checked/>
					<input type="checkbox" v-field-name='"Checkbox2"' value="checkbox not checked value"/>
					<input type="number" v-field-name='"Number1"' value="123"/>
					<base-input v-field-name='"BaseInput1"' label="Label1" value="base input value"></base-input>
				</div>
			`,
			data() {
				return {  }
			}
		}

		const wrapper = mount(Text1)
		expect(form.get("Hidden1")).toEqual("hidden1value");
		expect(form.get("Radio1")).toEqual("Radio1 checked value");
		expect(form.get("Checkbox1")).toEqual("checkbox checked value");
		expect(form.get("Checkbox2")).toBeNull();
		expect(form.get("Textarea1")).toEqual("textarea1 value");
		expect(form.get("Number1")).toEqual("123");
		expect(form.get("BaseInput1")).toEqual("base input value");


		const input = wrapper.find("input[type=text]")
		const value = "12345"
		await input.setValue(value)
		expect(form.get("Text1")).toEqual(value);

		const baseInput = wrapper.find(".base-input input")
		await baseInput.setValue(value)
		expect(form.get("BaseInput1")).toEqual(value);

	})
})
