import { describe, it, vi, expect } from 'vitest'
import { mountTemplate } from './testutils'
import { nextTick, ref } from 'vue'

describe('init-context', () => {
  it('with vars', async () => {
    const Text1 = {
      template: `
				<div v-init-context:vars="{a: 1, b:2}">
					<span :a="vars.a"></span>
                    <button @click="vars.a = 4">change it</button>
				</div>
			`,
      setup() {
        const vars = ref({ c: '2' })
        const change2 = function () {
          const v = vars.value as any
          v.a = 3
          // console.log("change2", vars)
        }
        return {
          vars,
          change2
        }
      }
    }

    const wrapper = mountTemplate(`<Text1></Text1>`, { components: { Text1 } })
    await nextTick()
    await wrapper.getComponent(Text1).vm.change2()
    console.log(wrapper.html())
    const span = wrapper.find('span')
    expect(span.attributes('a')).toEqual(`3`)
    await wrapper.find('button').trigger('click')
    const span2 = wrapper.find('span')
    expect(span2.attributes('a')).toEqual(`4`)
    console.log(wrapper.html())
  })
})
