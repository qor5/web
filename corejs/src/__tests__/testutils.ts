import { expect, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { plaidPlugin, Root } from '../app'
import { type Ref } from 'vue'

export function mockFetchWithReturnTemplate(requestedForm: Ref<FormData>, responseJSON: object) {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    requestedForm.value = opts.body
    return Promise.resolve(new Response(JSON.stringify(responseJSON)))
  })
}

export function mountTemplate(template: string, global = {}): VueWrapper {
  return mount(Root, {
    props: {
      initialTemplate: template
    },
    global: {
      ...global,
      plugins: [plaidPlugin]
    }
  })
}
