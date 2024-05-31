import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
import { inject, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { VFileInput } from 'vuetify/components/VFileInput'

const BaseInput = {
  template: `
    <label class="base-input">
      {{ label }}
      <input
      v-bind="$attrs"
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
      >
    </label>`,
  props: {
    label: String,
    modelValue: String
  }
}

describe('form', () => {
  it('form data on initial, on change', async () => {
    const Text1 = {
      template: `
        <div>
          <go-plaid-scope v-slot='{ form }' :form-init='{Text1: 123}'>
            <input type="text" v-model='form.Text1'/>
            <button @click='plaid().form(form).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
        </div>
      `,
      setup() {
        return {
          plaid: inject('plaid')
        }
      }
    }
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1 } })
    await nextTick()
    await wrapper.find('button').trigger('click')
    expect(Object.fromEntries(form.value)).toEqual({ Text1: '123' })

    const input = wrapper.find('input[type=text]')
    const value = '12345'
    await input.setValue(value)
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(Object.fromEntries(form.value)).toEqual({ Text1: '12345' })
  })

  it('v-chip-group', async () => {
    const initObject = `{ ChipGroup1: ["NY", "HZ"] }`
    const template = `
        <div>
          <go-plaid-scope v-slot='{ form }' :form-init='${initObject}'>
            <v-chip-group v-model="form.ChipGroup1" multiple>
              <v-chip id="id_hz" value="TK" filter>Hangzhou</v-chip>
              <v-chip id="id_tk" value="NY" filter>Tokyo</v-chip>
              <v-chip id="id_ny" value="HZ" filter>New York</v-chip>
            </v-chip-group>
            <button @click='plaid().form(form).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
        </div>
      `

    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(template)
    await nextTick()
    await wrapper.find('button').trigger('click')
    expect(form.value.getAll('ChipGroup1')).toEqual(['NY', 'HZ'])

    await wrapper.find('#id_hz').trigger('click')
    await nextTick()
    expect(wrapper.find('#id_hz .v-chip__filter').attributes('style')).toEqual('')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(form.value.getAll('ChipGroup1')).toEqual(['NY', 'HZ', 'TK'])
  })

  it('v-file-input', async () => {
    const template = `
        <div>
          <go-plaid-scope v-slot='{ form }' :form-init='{}'>
            <v-file-input label="File input" v-model="form.Files1"></v-file-input>
            <button @click='plaid().form(form).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
        </div>
      `

    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(template)
    await nextTick()
    wrapper
      .getComponent(VFileInput)
      .vm.$emit('update:modelValue', [new File([''], 'test.txt', { type: 'text/plain' })])
    await wrapper.find('button').trigger('click')
    expect((form.value.getAll('Files1')[0] as File).name).toEqual('test.txt')
  })

  it('input type file', async () => {
    const template = `
        <div>
          <go-plaid-scope v-slot='{ form }' :form-init='{}'>
            <input id="file1" type="file" @change="form.Files1 = $event.target.files">
            <button @click='plaid().form(form).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
        </div>
      `

    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(template)
    await nextTick()
    const input = wrapper.find('#file1')

    const file1 = new File(['content'], 'test1.txt', { type: 'text/plain' })
    const file2 = new File(['content'], 'test2.txt', { type: 'text/plain' })
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(input.element, 'files', {
      value: [file1, file2],
      writable: false
    })

    input.element.dispatchEvent(event)

    await wrapper.find('button').trigger('click')
    expect(form.value.getAll('Files1').map((f) => (f as File).name)).toEqual([
      'test1.txt',
      'test2.txt'
    ])
  })

  it('update and v-on order', async () => {
    const Text1 = {
      template: `
        <div>
          <go-plaid-scope v-slot="{ form }" :form-init="{Text1: '111'}">
            <input type="text" v-model='form.Text1'
              v-on:input="change2($event.target.value+'later')"
              v-on:input.trim="change2($event.target.value+'later2')"
            />
            <button @click='plaid().form(form).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
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
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
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
          <go-plaid-scope v-slot="{ form }" :form-init="{BaseInput1: 'base input value'}">
            <base-input v-model='form.BaseInput1' label="Label1"></base-input>
            <button @click='plaid().form(form).eventFunc("hello").go()'></button>
          </go-plaid-scope>
        </div>
      `,
      setup() {
        return {
          plaid: inject('plaid')
        }
      }
    }

    it('initial value without any change can update to form', async () => {
      const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
      await nextTick()
      const input = wrapper.find('input')

      expect(input.element.value).toEqual('base input value')
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
      await wrapper.find('button').trigger('click')
      await flushPromises()
      expect(Object.fromEntries(form.value)).toEqual({ BaseInput1: 'base input value' })
    })

    it('test change value can update to form', async () => {
      const value = '12345'
      const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
      await nextTick()
      const input = wrapper.find('input')

      await input.setValue(value)
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
      await wrapper.find('button').trigger('click')
      await flushPromises()
      expect(Object.fromEntries(form.value)).toEqual({ BaseInput1: value })
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
          <go-plaid-scope v-slot="{ form }" :form-init="{
            Textarea1: 'textarea1 value',
            Text1: 'text value',
            Radio1: 'Radio1A',
            Checkbox1: 'CheckBoxB',
            Hidden1: 'hidden1value',
            Number1: '123',
            Select1: 'cat',
            BaseInput1: 'base input value',
          }">

            <textarea v-model='form.Textarea1'></textarea>
            <input id="text1" type="text" v-model='form.Text1' />
            <input type="radio" v-model='form.Radio1' value="Radio1A"/>
            <input type="radio" v-model='form.Radio1' value="Radio1B"/>
            <input type="hidden" v-model='form.Hidden1' value="hidden1value"/>
            <input type="checkbox" v-model='form.Checkbox1' value="CheckBoxA"/>
            <input type="checkbox" v-model='form.Checkbox1' value="CheckBoxB"/>
            <input type="number" v-model='form.Number1'  value="123"/>
            <select v-model='form.Select1' >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </select>
            <base-input v-model='form.BaseInput1'  label="Label1"
            ></base-input>
            <button id='button1' @click='plaid().form(form).eventFunc("hello").go()'></button>
          </go-plaid-scope>
        </div>
      `
    }
    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1, BaseInput } })
    await nextTick()
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    await wrapper.find('#button1').trigger('click')
    expect(Object.fromEntries(form.value)).toEqual({
      BaseInput1: 'base input value',
      Checkbox1: 'CheckBoxB',
      Hidden1: 'hidden1value',
      Number1: '123',
      Radio1: 'Radio1A',
      Text1: 'text value',
      Textarea1: 'textarea1 value',
      Select1: 'cat'
    })
    console.log(wrapper.html())

    const input = wrapper.find('#text1')
    const value = '12345'
    await input.setValue(value)
    await wrapper.find('#button1').trigger('click')
    await flushPromises()
    expect(form.value.get('Text1')).toEqual(value)
  })

  describe('field name simple', () => {
    it('test value not checked checkbox', async () => {
      const wrapper = mountTemplate(
        `
        <div class="Text1">
          <go-plaid-scope v-slot="{ form }" :form-init='{Checkbox2: ["CheckBoxA"]}'>
            <input id="check1" type="checkbox" name="checkbox2" v-model='form.Checkbox2' value="CheckBoxA"/>
            <input id="check2" type="checkbox" name="checkbox2" v-model='form.Checkbox2' value="CheckBoxB"/>
            <button @click='plaid().form(form).eventFunc("hello").go()'></button>
          </go-plaid-scope>
        </div>`,
        {}
      )
      await nextTick()
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
      await wrapper.find('#check1').setValue(false)
      await wrapper.find('button').trigger('click')
      await flushPromises()
      expect(Object.fromEntries(form.value)).toEqual({})
    })

    it('test text input value', async () => {
      const template = `
        <div class="Text1">
          <go-plaid-scope v-slot="{ form }" :form-init='{Text1: "text value 1"}'>
            <input type="text" v-model="form.Text1"/>
            <button @click='plaid().form(form).eventFunc("hello").go()'></button>
          </go-plaid-scope>
        </div>`
      const wrapper = mountTemplate(template, {})
      await nextTick()
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, { body: template })
      await wrapper.find('button').trigger('click')
      expect(Object.fromEntries(form.value)).toEqual({ Text1: 'text value 1' })
      await flushPromises()
      console.log(wrapper.html())
      const input = wrapper.find('input[type=text]')
      const value = '12345'
      await input.setValue(value)
      await wrapper.find('button').trigger('click')
      expect(form.value.get('Text1')).toEqual(value)
    })

    it('test assign form value without :form-init', async () => {
      const template = `
        <div class="Text1">
          <go-plaid-scope v-slot="{ form }" :form-init='{Text1: "text value 1"}'>
            <input type="text" v-model="form.Text1" v-assign='[form, {Text1: "123"}]'/>
            <button @click='plaid().form(form).eventFunc("hello").go()'></button>
          </go-plaid-scope>
        </div>`
      const wrapper = mountTemplate(template, {})
      await nextTick()
      const form = ref(new FormData())
      mockFetchWithReturnTemplate(form, { body: template })
      await wrapper.find('button').trigger('click')
      await flushPromises()
      console.log(wrapper.html())
      expect(Object.fromEntries(form.value)).toEqual({ Text1: '123' })
    })
  })
})
