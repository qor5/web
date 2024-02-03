import { defineComponent, inject, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate } from './testutils'
// import plaidFormTest from './plaidFormTest.vue'

describe('portal', () => {
  it('vars', async () => {
    const Comp1 = defineComponent({
      template: `
				<div class="comp1" :value="vars.value1">
          <button id="Comp1Change" @click="change">Change</button>
        </div>
        
			`,
      setup() {
        const vars = inject<any>('vars')
        const change = () => {
          console.log('changed')
          vars.value1 = 'comp1 changed'
        }
        return {
          vars,
          change
        }
      }
    })

    const Comp2 = defineComponent({
      template: `
				<div class="son" v-bind:value="vars.value">
          <button id="Comp2Change" @click="change">Change</button>
        </div>
			`,
      setup() {
        const vars = inject<any>('vars')
        const change = () => {
          console.log('changed')
          vars.value1 = 'comp2 changed'
        }
        return {
          vars,
          change
        }
      }
    })

    const Root = {
      template: `
				<div>
          <comp2></comp2>
          <go-plaid-portal :visible="true" :portal-name='"portal1"'>
					  <input type="text" v-init-context:vars='{value1: "222"}'/>
			  	</go-plaid-portal>
          <button id='postForm1' @click='plaid().fieldValue("value1", vars.value1).eventFunc("hello").go()'>Post Form 1</button>
				</div>
			`,
      setup() {
        const change2 = (val: any) => {
          console.log('change2', val)
        }
        return {
          change2,
          plaid: inject('plaid'),
          vars: inject('vars')
        }
      }
    }

    const wrapper = mountTemplate(`<Root></Root>`, { components: { Root, Comp1, Comp2 } })
    await nextTick()
    console.log(wrapper.html())

    // v-init-context should be able to set vars value1, and can be posted to server with fieldValue
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<Root></Root>' })
    await wrapper.find('#postForm1').trigger('click')
    await flushPromises()
    expect(Object.fromEntries(form.value)).toEqual({ value1: '222' })
    console.log(wrapper.html())

    // change value1 in Comp2, and post form again, value1 should be updated to 'comp2 changed'
    await wrapper.find('#Comp2Change').trigger('click')
    await wrapper.find('#postForm1').trigger('click')
    await flushPromises()
    expect(Object.fromEntries(form.value)).toEqual({ value1: 'comp2 changed' })

    // replace the portal with Comp1, change value1 in Comp1, and post form again, value1 should be updated to 'comp2 changed'
    mockFetchWithReturnTemplate(form, {
      updatePortals: [{ name: 'portal1', body: `<Comp1></Comp1>` }]
    })
    await wrapper.find('#postForm1').trigger('click')
    await flushPromises()
    await wrapper.find('#Comp1Change').trigger('click')
    await wrapper.find('#postForm1').trigger('click')
    expect(Object.fromEntries(form.value)).toEqual({ value1: 'comp1 changed' })

    console.log(wrapper.html())
  })

  it('vars error', async () => {
    const Root = {
      template: `
				<div v-init-context:vars='{value: "222"}'>
				<input type="text" v-init-context:vars='{value: "333"}'/>
				</div>
			`,
      methods: {
        change2: function (val: any) {
          console.log('change2', val)
        }
      },

      data() {
        return {
          vars: {}
        }
      },

      provide(): any {
        return {
          // @ts-ignore
          vars: this.vars
        }
      }
    }

    expect((mount(Root).vm as any).vars['value']).toEqual('333')
  })

  it('plaidForm', async () => {
    const wrapper = await mount(plaidFormTest)
    console.log(wrapper.html())

    const portalComp: any = wrapper.find('.go-plaid-portal')
    await portalComp.vm.changeCurrentTemplate(`
<input from="server" type="text" :value='555' v-field-name='[plaidForm, "Name"]'/>
`)

    console.log(wrapper.html())
    const scope: any = wrapper.findComponent(GoPlaidScope)
    console.log(inspectFormData(scope.vm.plaidForm))
    expect(scope.vm.plaidForm.get('Name')).toEqual('555')
  })
})
