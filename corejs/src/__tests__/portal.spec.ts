import { defineComponent, inject, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
declare let window: any

describe('portal', () => {
  it('vars and form value change', async () => {
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
            <input type="text" :eval='vars.value1 = "222"'/>
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

    // replace the portal with Comp1, change value1 in Comp1, and post form again, value1 should be updated to 'comp1 changed'
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

  it('vars reflect last value', async () => {
    const Root = {
      template: `
        <div :any='vars.value1 = "222"'>
            <input type="text" :any1='vars.value1 = "333"'/>
            <button @click='plaid().eventFunc("hello").fieldValue("value1", vars.value1).go()'></button>
        </div>
      `,
      setup() {
        return {
          vars: inject('vars'),
          plaid: inject('plaid')
        }
      }
    }
    const wrapper = mountTemplate(`<Root></Root>`, { components: { Root } })
    await nextTick()
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<Root></Root>' })

    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(Object.fromEntries(form.value)).toEqual({ value1: '333' })
  })

  it('scoped new form replace value with portal', async () => {
    const Root = defineComponent({
      template: `
        <go-plaid-scope v-slot="{ form }" :form-init="{ Age: '222', Company: 'The Plant', Name: '222' }">
          <div>{{ form.Age }}</div>
          <input v-model='form.Age' type="text" />
          <input v-model='form.Company' type="text" />
          <go-plaid-portal :form="form" :portal-name="'portalA'" :visible="true">
            <input v-model='form.Name' type="text" />
          </go-plaid-portal>
          <button @click='plaid().form(form).eventFunc("hello").go()'></button>
        </go-plaid-scope>
      `,
      setup() {
        return {
          plaid: inject('plaid')
        }
      }
    })

    const wrapper = mountTemplate(`<Root></Root>`, { components: { Root } })
    await nextTick()

    const form = ref(new FormData())
    // Use any tag with any attributes that set locals value to update the form value
    mockFetchWithReturnTemplate(form, {
      updatePortals: [
        {
          name: 'portalA',
          body: `<input from="server" type="text" :value='form.Name="555"'/>`
        }
      ]
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await wrapper.find('button').trigger('click')
    console.log(wrapper.html())

    expect(form.value.get('Name')).toEqual('555')

    // Use varsScript that set locals value to update the form value
    mockFetchWithReturnTemplate(form, {
      runScript: 'form.Name = "666"'
    })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    await wrapper.find('button').trigger('click')
    console.log(wrapper.html())

    expect(form.value.get('Name')).toEqual('666')
  })

  it('portal auto reload', async () => {
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, { body: '<h3>666</h3>' })

    const wrapper = mountTemplate(`
      <div class="mycomp">
        <go-plaid-scope :init='{interval: 200}' v-slot='{ locals }'>
          <go-plaid-portal
            portal-name="portal1"
            :visible='true' 
            :locals='locals' 
            :loader='plaid().vars(vars).locals(locals).form(form).method("POST").eventFunc("autoReload")' 
            :auto-reload-interval='locals.interval'>
          </go-plaid-portal>
          <button @click='locals.interval = 0'>stop</button>
        </go-plaid-scope>
      </div>
    `)

    await nextTick()
    console.log(wrapper.html())
    await flushPromises()
    console.log(wrapper.html())
    expect(wrapper.find('.mycomp h3').text()).toEqual('666')
    await wrapper.find('button').trigger('click')
    await flushPromises()
  })

  it('reload portal should keep form value', async () => {
    const template = `
        <v-dialog>
        <template v-slot:activator='{ props: activatorProps }'>
        <button id="selectBtn" v-bind='activatorProps'>Select</button>
        </template>
        
        <go-plaid-portal :visible='true' :form='form' :locals='locals' :loader='plaid().vars(vars).locals(locals).form(form).method("POST").eventFunc("menuItems")' portal-name='menuContent'></go-plaid-portal>
        </v-dialog>
      `

    const form = ref(new FormData())
    // Use any tag with any attributes that set locals value to update the form value
    mockFetchWithReturnTemplate(form, (url: any, opts: any) => {
      if (url.includes('menuItems')) {
        return {
          body: `
            <div>
            <v-dialog :width='"500"'>
            <template v-slot:activator='{ props: activatorProps }'>
            <button id='createNewBtn' v-bind='activatorProps'>Create New</button>
            </template>
            
            <go-plaid-scope v-slot='{ locals, form }' :form-init='{"Company":"42","Error":""}'>
            <go-plaid-portal :visible='true' :form='form' :locals='locals' :loader='plaid().vars(vars).locals(locals).form(form).method("POST").eventFunc("addItemForm")' portal-name='addItemForm'></go-plaid-portal>
            </go-plaid-scope>        
            </v-dialog>
            </div>          `
        }
      }

      if (url.includes('addItemForm')) {
        return {
          body: `
            <input id="companyInput" type="text" v-model='form.Company' :why="form.Company"></input>
            <button id='addItem' @click='plaid().vars(vars).locals(locals).form(form).method("POST").eventFunc("addItem").go()'>Create</button>
        `
        }
      }

      if (url.includes('addItem')) {
        return {
          reloadPortals: ['addItemForm']
        }
      }
    })

    const wrapper = mountTemplate(template)

    await nextTick()
    await flushPromises()
    // console.log(wrapper.html())
    await wrapper.find('#selectBtn').trigger('click')
    await waitUntil((): boolean => {
      return document.getElementById('createNewBtn') != null
    })
    document.getElementById('createNewBtn')!.click()
    await flushPromises()
    await waitUntil((): boolean => {
      return document.getElementById('addItem') != null
    })

    const input = document.getElementById('companyInput') as HTMLInputElement
    input.value = '123'
    input.dispatchEvent(new InputEvent('input'))
    await nextTick()
    // console.log(document.body.innerHTML)

    document.getElementById('addItem')!.click()
    await flushPromises()

    // after reload the portal, check if the input value is still 123
    expect((document.getElementById('companyInput') as HTMLInputElement).value).toEqual('123')
  })
  it('reload portal keep height', async () => {
    const template = `
        <div>
            <go-plaid-portal  portal-name='content' :visible="true" :loader='plaid().vars(vars).locals(locals).form(form).method("POST").eventFunc("loadIframe")'>
            </go-plaid-portal>
        </div>
      `
    const form = ref(new FormData())
    mockFetchWithReturnTemplate(form, {
      body: `<iframe ref="test" style="height: 400px;width: 100px" id="content" src="https://www.google.com/"></iframe>`
    })

    const wrapper = mountTemplate(template)
    await nextTick()
    await flushPromises()

    expect(wrapper.find('.go-plaid-portal').attributes().style).toEqual('height: 400px;')
  })
})
