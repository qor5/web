import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
import { inject, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { VFileInput } from 'vuetify/components/VFileInput'

describe('form field', () => {
  it('form data on initial, on change', async () => {
    const Text1 = {
      template: `
        <div>
          <go-plaid-scope v-slot='{ locals }' :init='{Text1: 123}'>
            <input type="text" v-model='locals.Text1'/>
            <button @click='plaid().locals(locals).eventFunc("hello").go()'>Submit</button>
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
    const initObject = { ChipGroup1: ['NY', 'HZ'] }
    const template = `
        <div>
          <go-plaid-scope v-slot='{ locals }' init-string='${JSON.stringify(initObject)}'>
            <v-chip-group v-model="locals.ChipGroup1" multiple>
              <v-chip id="id_hz" value="TK" filter>Hangzhou</v-chip>
              <v-chip id="id_tk" value="NY" filter>Tokyo</v-chip>
              <v-chip id="id_ny" value="HZ" filter>New York</v-chip>
            </v-chip-group>
            <button @click='plaid().locals(locals).eventFunc("hello").go()'>Submit</button>
          </go-plaid-scope>
        </div>
      `

    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(template)
    await nextTick()
    await wrapper.find('button').trigger('click')
    expect(form.value.get('ChipGroup1[0]')).toEqual('NY')
    expect(form.value.get('ChipGroup1[1]')).toEqual('HZ')

    await wrapper.find('#id_hz').trigger('click')
    await nextTick()
    expect(wrapper.find('#id_hz .v-chip__filter').attributes('style')).toEqual('')

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(form.value.get('ChipGroup1[0]')).toEqual('NY')
    expect(form.value.get('ChipGroup1[1]')).toEqual('HZ')
    expect(form.value.get('ChipGroup1[2]')).toEqual('TK')
  })

  it('v-file-input', async () => {
    const initObject = {}
    const template = `
        <div>
          <go-plaid-scope v-slot='{ locals }' init-string='${JSON.stringify(initObject)}'>
            <v-file-input label="File input" v-model="locals.Files1"></v-file-input>
            <button @click='plaid().locals(locals).eventFunc("hello").go()'>Submit</button>
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
    const initObject = {}
    const template = `
        <div>
          <go-plaid-scope v-slot='{ locals }' init-string='${JSON.stringify(initObject)}'>
            <input id="file1" type="file" @change="locals.Files1 = $event.target.files">
            <button @click='plaid().locals(locals).eventFunc("hello").go()'>Submit</button>
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
})
