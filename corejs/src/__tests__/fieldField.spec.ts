import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
import { inject, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

describe('form field', () => {
  it('form data on initial, on change', async () => {
    const Text1 = {
      template: `
        <div>
          <input type="text" v-model='formField(plaidForm, "Text1", "123").model'/>
          <button @click='plaid().eventFunc("hello").go()'>Submit</button>
        </div>
      `,
      setup() {
        return {
          plaid: inject('plaid'),
          plaidForm: inject<FormData>('plaidForm')
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
})
