import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('assign', () => {
  it('v-assign', async () => {
    const template = `
        <go-plaid-scope v-slot="{ form }" :form-init="{a: 1}">
            <input type='text' v-model='form["List[0].Text1"]' v-assign='[form, {"List[0].Text1":"123"}]'/>
            <v-text-field v-model='form["List[1].Text1"]' v-assign='[form, {"List[1].Text1":"234"}]'/>
        </go-plaid-scope>`
    const wrapper = mountTemplate(template)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('input').element.value).toEqual('123')
    expect((wrapper.find('.v-field input').element as any).value).toEqual('234')
    // await waitUntil(() => wrapper.find('input').element.value === '123')
  })

  it('v-run', async () => {
    const template = `
        <go-plaid-scope v-slot="{ locals }">
            <input v-run="(el) => { locals.value = el.value }" value="123"/>
            <h1>{{locals.value}}</h1>
        </go-plaid-scope>
`
    const wrapper = mountTemplate(template)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual(`123`)
  })
})
