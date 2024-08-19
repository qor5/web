import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountTemplate } from './testutils'

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
  })
})
