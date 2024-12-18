import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { defineComponent, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import GoPlaidScope from '../go-plaid-scope.vue'
import GoPlaidPortal from '../go-plaid-portal.vue'

export default defineComponent({
  components: { GoPlaidPortal, GoPlaidScope }
})

declare let window: any

describe('scope', () => {
  it('vars and form', async () => {
    const wrapper = mountTemplate(`
      <div>
      <go-plaid-scope :init='{hello: "123",world:"888"}' v-slot="{locals}">
        <div id="l1">{{ locals.hello }}</div>
        <div id="l1-world">{{ locals.world }}</div>
        <button id="l1Btn" @click='locals.hello = "456"'></button>
        <go-plaid-scope :init='{hello: "789"}' v-slot="{locals:childLocals}">
          <div id="l2">{{ childLocals.hello }}</div>
          <button id="l2Btn" @click='childLocals.hello = "999"'></button>

          <go-plaid-scope v-slot="{form}">
            <div id="l3">{{ form.Name }}</div>
            <input type="text"
                 :value='form.Name = "AAA"'>
            <button id="l3Btn"
                @click='childLocals.hello = form.Name'></button>

            <go-plaid-scope v-slot="{ form }">
              <div id="l4">{{ form.Name }}</div>
              <input id="input4" type="text"
                   :value='form.Name = "BBB"'>
              <go-plaid-scope>
                <div id="l5">{{ locals.world }}</div>
                <button id="l5Btn" @click='locals.world = "l5-888"'></button>

                <go-plaid-scope :init='{top: locals}' v-slot="{locals}">
                  <div id="l6">{{ locals.top.world }}</div>
                  <button id="l6Btn" @click='locals.top.world = "l6-888"'></button>
                </go-plaid-scope>
              </go-plaid-scope>
            </go-plaid-scope>

          </go-plaid-scope>

        </go-plaid-scope>
      </go-plaid-scope>
      <div class="globalForm">{{form.Name}}</div>
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())

    const btn: any = wrapper.find('#l1Btn')
    await btn.trigger('click')
    const l1: any = wrapper.find('#l1')
    expect(l1.text()).toEqual(`456`)

    const btn2: any = wrapper.find('#l2Btn')
    await btn2.trigger('click')
    const l2: any = wrapper.find('#l2')
    expect(l2.text()).toEqual(`999`)

    const btn3: any = wrapper.find('#l3Btn')
    const input4: any = wrapper.find('#input4')
    await input4.setValue('CCC')
    await btn3.trigger('click')
    console.log(wrapper.html())
    const l3: any = wrapper.find('#l3')
    expect(l2.text()).toEqual(`AAA`)
    expect(l3.text()).toEqual(`AAA`)
    const l4: any = wrapper.find('#l4')
    expect(l4.text()).toEqual(`BBB`)

    const l1_world: any = wrapper.find('#l1-world')
    expect(l1_world.text()).toEqual(`888`)

    const l5: any = wrapper.find('#l5')
    expect(l5.text()).toEqual(`888`)
    const btn5: any = wrapper.find('#l5Btn')
    await btn5.trigger('click')
    expect(l5.text()).toEqual(`l5-888`)
    expect(l1_world.text()).toEqual(`l5-888`)

    const l6: any = wrapper.find('#l6')
    expect(l6.text()).toEqual(`l5-888`)
    const btn6: any = wrapper.find('#l6Btn')
    await btn6.trigger('click')
    expect(l6.text()).toEqual(`l6-888`)
    expect(l1_world.text()).toEqual(`l6-888`)
  })

  it('scope init can be array or object', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope :init='[{hello: "123"}, {checked: true}, {file: "two"}]' v-slot="{ locals }">
         <div id="testArray">{{ locals.hello }}, {{ locals.checked }}, {{ locals.file }}</div>
        </go-plaid-scope>      
        <go-plaid-scope :init='{a: "123", b: "456", file: "three"}' v-slot="{ locals }">
         <div id="testObject">{{ locals.a }}, {{ locals.b }}, {{ locals.file }}</div>
        </go-plaid-scope>
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())

    const testArray: any = wrapper.find('#testArray')
    expect(testArray.text()).toEqual(`123, true, two`)
    const testObject: any = wrapper.find('#testObject')
    expect(testObject.text()).toEqual(`123, 456, three`)
  })

  it('scope locals update portal', async () => {
    const Root = {
      template: `
              <go-plaid-scope :init="{hello:'123'}" v-slot="{locals }">
                <go-plaid-portal portal-name="test" :locals="locals" :visible="true">
                </go-plaid-portal>
                <button
                    @click='update'>
                </button>
              </go-plaid-scope>

            `,
      setup() {
        return {
          update: () => {
            window.__goplaid = window.__goplaid ?? {}
            window.__goplaid.portals = window.__goplaid.portals ?? {}
            const { updatePortalTemplate } = window.__goplaid.portals['test']
            updatePortalTemplate(`<div id="test">{{locals.hello}}</div>`)
          }
        }
      }
    }
    const wrapper = mountTemplate(`<Root></Root>`, { components: { Root } })
    await nextTick()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await nextTick()
    await flushPromises()
    expect(wrapper.html()).toContain('123')
  })
  it('scope locals update dash', async () => {
    const Root = {
      template: `
              <go-plaid-scope :dash-init="{hello:'1234'}" v-slot="{dash }">
                <go-plaid-portal portal-name="test" :dash="dash" :visible="true">
                </go-plaid-portal>
                <button
                    @click='update'>
                </button>
              </go-plaid-scope>

            `,
      setup() {
        return {
          update: () => {
            window.__goplaid = window.__goplaid ?? {}
            window.__goplaid.portals = window.__goplaid.portals ?? {}
            const { updatePortalTemplate } = window.__goplaid.portals['test']
            updatePortalTemplate(`<div id="test">{{dash.hello}}</div>`)
          }
        }
      }
    }
    const wrapper = mountTemplate(`<Root></Root>`, { components: { Root } })
    await nextTick()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await nextTick()
    await flushPromises()
    expect(wrapper.html()).toContain('1234')
  })

  it('simulate computed via locals', async () => {
    const wrapper = mountTemplate(`
            <go-plaid-scope :init="{
              hello:'123',
              computedFunc: function() {
                return this.hello
              }
            }" v-slot="{ locals }">
              <button id="btn"
                  @click='locals.hello = "345";'>
              </button>
              <div id="txt">{{ locals.computedFunc() }}</div>
            </go-plaid-scope>
          `)
    await nextTick()
    console.log(wrapper.html())

    const txt: any = wrapper.find('#txt')
    expect(txt.text()).toEqual(`123`)
    const btn: any = wrapper.find('#btn')
    await btn.trigger('click')
    expect(txt.text()).toEqual(`345`)
  })

  it('simulate computed via locals and v-on-mounted', async () => {
    const wrapper = mountTemplate(`
            <go-plaid-scope :init="{
              hello:'123',
              computedFunc: function() {
                return '234'
              }
            }" v-slot="{ locals }">
              <div v-on-mounted="function() {
                locals.hello = '666'
                locals.computedFunc = function() {
                  return this.hello
                }
              }"></div>
              <button id="btn"
                  @click='locals.hello = "888";'>
              </button>
              <div id="txt">{{ locals.computedFunc() }}</div>
            </go-plaid-scope>
          `)
    await nextTick()
    console.log(wrapper.html())

    const txt: any = wrapper.find('#txt')
    expect(txt.text()).toEqual(`666`)
    const btn: any = wrapper.find('#btn')
    await btn.trigger('click')
    expect(txt.text()).toEqual(`888`)
  })
})
