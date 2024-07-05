import { describe, expect, it } from 'vitest'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'

describe('scope change', () => {
  it('debounce locals', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope 
            :init='{debouncedValue: 1, debouncedCount: 0, value: 1}' 
            v-slot="{ locals }" 
            @change-debounced='({locals}) => { locals.debouncedCount++; locals.debouncedValue=locals.value }'
            :use-debounce='800'
        >
          <h1>{{ locals.debouncedCount }}</h1>
          <h2>{{ locals.debouncedValue }}</h2>
          <h3>{{ locals.value }}</h3>
          <button @click="locals.value++"></button>
        </go-plaid-scope>
      </div>
      `)

    await nextTick()
    await flushPromises()

    console.log(wrapper.html())
    await new Promise((resolve) => {
      setTimeout(async () => {
        await wrapper.find('button').trigger('click')
        console.log('clicked')
        await wrapper.find('button').trigger('click')
        await waitUntil(() => wrapper.find('h2').text() === '3')
        console.log(wrapper.html())
        // Only executed once for debouncedValue although clicked twice
        expect(wrapper.find('h1').text()).toEqual('1')
        expect(wrapper.find('h2').text()).toEqual('3')
        expect(wrapper.find('h3').text()).toEqual('3')
        resolve('')
      }, 100)
    })
  })

  it('debounce form with v-model', async () => {
    const form = ref(new FormData())
    let fetchCount = 0
    mockFetchWithReturnTemplate(form, () => {
      fetchCount++
      return { body: '<h6></h6>' }
    })
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope 
            :init='{ value: "0" }' 
            @change-debounced='({locals, form}) => { plaid().form(form).locals(locals).vars(vars).eventFunc("hello").go() }'
            :use-debounce='600'
            v-slot="{ locals, form }">
          <v-text-field v-model="form.value"></v-text-field>
        </go-plaid-scope>
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())
    await new Promise((resolve) => {
      setTimeout(async () => {
        await wrapper.find('input').setValue('1')
        await wrapper.find('input').setValue('12')
        await wrapper.find('input').setValue('123')
        await waitUntil(() => form.value.get('value') === '123')
        console.log(wrapper.html())
        expect(fetchCount).toEqual(1)
        resolve('')
      }, 100)
    })
  })

  it('debounce assign', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-scope 
            :form-init="{value:0}"
            v-slot="{ form }" 
            @change-debounced='({form,locals,oldLocals,oldForm}) => { form.value++ }'
            :use-debounce='600'
        >
          <v-text-field id="name" v-model="form.name" v-assign="[form,{'name':'debounced'}]"></v-text-field>
          <button @click="form.name='change'"></button>
          <h1>{{form.value}}</h1>
        </go-plaid-scope>
      </div>
      `)

    await nextTick()
    await waitUntil(() => (wrapper.find('.v-field input').element as any).value === 'debounced')
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve('')
      }, 800)
    })
    expect(wrapper.find('h1').text()).toEqual('0')
    await wrapper.find('button').trigger('click')
    await waitUntil(() => (wrapper.find('.v-field input').element as any).value === 'change')
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve('')
      }, 800)
    })
    expect(wrapper.find('h1').text()).toEqual('1')
    console.log(wrapper.html())
  })
})
