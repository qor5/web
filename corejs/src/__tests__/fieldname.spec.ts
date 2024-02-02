import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
import { inject, nextTick, ref } from 'vue'

describe('field name', () => {
  const BaseInput = {
    template: `
			<label class="base-input">
				{{ label }}
				<input
				v-bind="$attrs"
				:value="modelValue"
				@input="$emit('input', $event.target.value)"
				>
			</label>
			`,
    props: {
      label: String,
      modelValue: String
    }
  }

  it('update and v-on order', async () => {
    const Text1 = {
      template: `
				<div>
					<input type="text" v-field-name='"Text1"'
						v-on:input="change2($event.target.value+'later')"
						v-on:input.trim="change2($event.target.value+'later2')"
					/>
					<button @click='plaid().eventFunc("hello").go()'>Submit</button>
				</div>
			`,
      setup() {
        const change2 = (val: any) => {
          console.log('change2', val)
          // form.set("Text1", val)
        }
        return {
          change2,
          plaid: inject('plaid')
        }
      }
    }
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, '<h3></h3>')
    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1 } })
    await nextTick()
    const input = wrapper.find('input[type=text]')
    const value = '12345'
    await input.setValue(value)
    await wrapper.find('button').trigger('click')
    expect(Object.fromEntries(form.value)).toEqual({ Text1: '12345' })
  })

  describe('component basic', async () => {
    const Text1 = {
      template: `
				<div class="Text1">
					<base-input v-field-name='"BaseInput1"' label="Label1"
                                modelValue="base input value"
					></base-input>
					<button @click='plaid().eventFunc("hello").go()'></button>
				</div>
			`,
      setup() {
        return {
          plaid: inject('plaid')
        }
      }
    }

    const value = '12345'
    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
    await nextTick()
    const input = wrapper.find('input')

    it('initial value without any change can update to form', async () => {
      expect(input.element.value).toEqual('base input value')
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, '<h3></h3>')
      await wrapper.find('button').trigger('click')
      expect(Object.fromEntries(form.value)).toEqual({ BaseInput1: 'base input value' })
    })

    it('test change value can update to form', async () => {
      await input.setValue(value)
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, '<h3></h3>')
      await wrapper.find('button').trigger('click')
      expect(Object.fromEntries(form.value)).toEqual({ BaseInput1: value })
    })

    it('clear v-field-name listeners', async () => {
      const w = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
      await nextTick()
      w.unmount()
    })
  })

  it('test value for all types of input', async () => {
    const Text1 = {
      setup() {
        return {
          plaid: inject('plaid')
        }
      },
      template: `
				<div class="Text1">
					<textarea v-field-name='"Textarea1"'>textarea1 value</textarea>
					<input type="text" v-field-name='"Text1"' value='text value'/>
					<input type="radio" v-field-name='"Radio1"' value="Radio1 checked value" checked/>
					<input type="radio" v-field-name='"Radio1"' value="Radio1 not checked value"/>
					<input type="hidden" v-field-name='"Hidden1"' value="hidden1value"/>
					<input type="checkbox" v-field-name='"Checkbox1"' value="checkbox checked value" checked/>
					<input type="checkbox" v-field-name='"Checkbox2"' value="checkbox not checked value"/>
					<input type="number" v-field-name='"Number1"' value="123"/>
					<base-input v-field-name='"BaseInput1"' label="Label1"
						value="base input value"
					></base-input>
          <button @click='plaid().eventFunc("hello").go()'></button>
        </div>
			`
    }
    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
    await nextTick()
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, '<h3></h3>')
    await wrapper.find('button').trigger('click')
    expect(Object.fromEntries(form.value)).toEqual({
      BaseInput1: 'base input value',
      Checkbox1: 'checkbox checked value',
      Hidden1: 'hidden1value',
      Number1: '123',
      Radio1: 'Radio1 checked value',
      Text1: 'text value',
      Textarea1: 'textarea1 value'
    })
    //
    // expect(form.get('Hidden1')).toEqual('hidden1value')
    // expect(form.get('Radio1')).toEqual('Radio1 checked value')
    // expect(form.get('Checkbox1')).toEqual('checkbox checked value')
    // expect(form.get('Checkbox2')).toBeNull()
    // expect(form.get('Textarea1')).toEqual('textarea1 value')
    // expect(form.get('Number1')).toEqual('123')
    // expect(form.get('BaseInput1')).toEqual('base input value')
    //
    // const input = wrapper.find('input[type=text]')
    // const value = '12345'
    // await input.setValue(value)
    // expect(form.get('Text1')).toEqual(value)
    //
    // const baseInput = wrapper.find('.base-input')
    // baseInput.vm.$emit('change', value)
    // expect(form.get('BaseInput1')).toEqual(value)
  })
})
