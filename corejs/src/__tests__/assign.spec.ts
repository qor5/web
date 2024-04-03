import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('assign', () => {
  it('test assign', async () => {
    const template = `<input type='color' v-model='form.Lists[0].Name' v-assign='[form, {"Lists[0].Name":"#ff0000"}]'>`
    const wrapper = mountTemplate(template)
    await nextTick()
    await flushPromises()
    expect(wrapper.find('input').element.value).toContain('#ff0000')
  })
})
