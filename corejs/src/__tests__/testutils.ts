import { expect, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { plaidPlugin, Root } from '../app'
import { type Ref } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = require('resize-observer-polyfill')

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
      plugins: [plaidPlugin, vuetify]
    }
  })
}
