import { describe, it, vi, expect } from 'vitest'
import { nextTick } from 'vue'
import { expectFetchWithFormAndReturnTemplate, mountTemplate } from './testutils'

describe('app', () => {
  it('plaid', async () => {
    expectFetchWithFormAndReturnTemplate('a=42&b=nice', '<h3></h3>')
    const r = mountTemplate(
      `<h1 @click='plaid().eventFunc("hello").fieldValue("a", 42).fieldValue("b", "nice").go()'></h1>`
    )
    await nextTick()
    await r.find('h1').trigger('click')
    //
    // console.log(r.html())
    // r.vm.changeTemplate(`<h2></h2>`)
    // await nextTick()
    // console.log(r.html())
  })
})
