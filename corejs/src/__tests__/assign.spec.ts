import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('assign', () => {
  it('test assign', async () => {
    const template = `<v-text-field type='text' v-model='form.Text1' v-assign='[form, {"Text1":"123"}]'/>`
    const wrapper = mountTemplate(template)
    await nextTick()
    await flushPromises()
    expect(wrapper.find('input').element.value).toContain('123')
    expect(wrapper.find('input').element.value).not.toContain('321')
  })
})
