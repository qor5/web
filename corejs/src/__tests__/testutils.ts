import { expect, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { plaidPlugin, Root } from '../app'

export function expectFetchWithFormAndReturnTemplate(
  expectedFormAsParams: string,
  returnedTemplate: string
) {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    expect(new URLSearchParams(opts.body).toString()).toBe(expectedFormAsParams)
    return Promise.resolve(new Response(JSON.stringify({ body: expectedFormAsParams })))
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
