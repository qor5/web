import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountTemplate } from './testutils'

describe('lifecycle', () => {
  it('v-on-mounted', async () => {
    const template = `
        <go-plaid-scope v-slot="{ locals }">
            <input v-on-mounted="({el, window}) => { 
              locals.equalsWindow = el.ownerDocument.defaultView === window;
              locals.value = el.value 
              vars.hello = el.value
            }" value="123" />
            <h1>{{locals.value}}</h1>
            <h2>{{locals.equalsWindow}}</h2>
            <h3>{{vars.hello}}</h3>
        </go-plaid-scope>
`
    const wrapper = mountTemplate(template)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual(`123`)
    expect(wrapper.find('h2').text()).toEqual(`true`)
    expect(wrapper.find('h3').text()).toEqual(`123`)
  })
  it('watch', async () => {
    const wrapper = mountTemplate(`
        <h1>{{vars.hello}}</h1>
        <h2>{{vars.hello2}}</h2>
        <h3>{{vars.hello3}}</h3>
        <div v-on-mounted="({watch, watchEffect}) => {
          vars.hello = '555';
          watch(() => vars.hello, (newVal, oldVal) => {
            console.log('watch: changed from', oldVal, 'to', newVal);
            vars.hello2 = newVal;
          });
          watchEffect(() => {
            console.log('watchEffect: current', vars.hello);
            vars.hello3 = vars.hello;
          })
        }" />
        <button id="btn"
            @click='vars.hello = "123";'>
        </button>
      `)
    await nextTick()
    console.log(wrapper.html())
    const btn: any = wrapper.find('#btn')
    await btn.trigger('click')
    expect(wrapper.find('h1').text()).toEqual('123')
    expect(wrapper.find('h2').text()).toEqual('123')
    expect(wrapper.find('h3').text()).toEqual('123')
  })
  it('ref', async () => {
    const wrapper = mountTemplate(`
      <div v-before-mount="({el, ref}) => {
        el._x = ref('x');
      }" v-on-mounted="({el}) => {
        vars.hello = el._x.value;
      }" >
         <h1>{{vars.hello}}</h1>
      </div>
    `)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual('x')
  })
})
