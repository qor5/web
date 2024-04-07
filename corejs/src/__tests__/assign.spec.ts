import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('assign', () => {
  it('test assign', async () => {
    const template = `<input type='text' v-model='form.Text1' v-assign='[form, {"Text1":"123"}]'/>`
    const wrapper = mountTemplate(template)
    await nextTick()
    await waitUntil(() => wrapper.find('input').element.value === '123')

  })
})
