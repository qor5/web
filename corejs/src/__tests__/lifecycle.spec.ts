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
        <h4>{{vars.watchTriggerCount}}</h4>
        <div v-if="!vars.hide" v-on-mounted="({watch, watchEffect}) => {
          console.log('mounted')
          vars.watchTriggerCount = vars.watchTriggerCount || 0;
          vars.hello = vars.hello || '555';
          watch(() => vars.hello, (newVal, oldVal) => {
            console.log('watch: changed from', oldVal, 'to', newVal);
            vars.hello2 = newVal;
            vars.watchTriggerCount++;
          }, { immediate: true });
          watchEffect(() => {
            console.log('watchEffect: current', vars.hello);
            vars.hello3 = vars.hello;
            vars.watchTriggerCount++;
          })
        }" v-on-unmounted="() => {
          console.log('unmounted')
        }" />
        <button id="btn1"
            @click='vars.hello = "123";'>
        </button>
        <button id="btn2"
            @click='vars.hello = "234";'>
        </button>
        <span @click='vars.hide = !vars.hide;'></span>
      `)
    await nextTick()
    console.log(wrapper.html())

    {
      const btn1: any = wrapper.find('#btn1')
      await btn1.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('123')
      expect(wrapper.find('h2').text()).toEqual('123')
      expect(wrapper.find('h3').text()).toEqual('123')
      expect(wrapper.find('h4').text()).toEqual('4')
    }
    {
      const span: any = wrapper.find('span')
      await span.trigger('click')
      console.log('should unmounted')

      const btn2: any = wrapper.find('#btn2')
      await btn2.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('234')
      expect(wrapper.find('h2').text()).toEqual('123')
      expect(wrapper.find('h3').text()).toEqual('123')
      expect(wrapper.find('h4').text()).toEqual('4')
    }

    {
      const span: any = wrapper.find('span')
      await span.trigger('click')
      console.log('should mounted')

      const btn2: any = wrapper.find('#btn2')
      await btn2.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('234')
      expect(wrapper.find('h2').text()).toEqual('234')
      expect(wrapper.find('h3').text()).toEqual('234')
      expect(wrapper.find('h4').text()).toEqual('6')
    }

    {
      const span: any = wrapper.find('span')
      await span.trigger('click')
      console.log('should unmounted')

      const btn2: any = wrapper.find('#btn1')
      await btn2.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('123')
      expect(wrapper.find('h2').text()).toEqual('234')
      expect(wrapper.find('h3').text()).toEqual('234')
      expect(wrapper.find('h4').text()).toEqual('6')
    }
  })
  it('watch with stop manually', async () => {
    const wrapper = mountTemplate(`
        <h1>{{vars.hello}}</h1>
        <h2>{{vars.hello2}}</h2>
        <h4>{{vars.watchTriggerCount}}</h4>
        <div v-if="!vars.hide" v-on-mounted="({watch}) => {
          console.log('mounted')
          vars.watchTriggerCount = vars.watchTriggerCount || 0;
          vars.hello = vars.hello || '555';
          vars.stopWatch = watch(() => vars.hello, (newVal, oldVal) => {
            console.log('watch: changed from', oldVal, 'to', newVal);
            vars.hello2 = newVal;
            vars.watchTriggerCount++;
          }, { immediate: true });
        }" v-on-unmounted="() => {
          console.log('unmounted')
        }" />
        <button id="btn1"
            @click='vars.hello = "123";'>
        </button>
        <button id="btn2"
            @click='vars.hello = "234";'>
        </button>
         <button id="btn3"
            @click='vars.stopWatch();'>
        </button>
        <span @click='vars.hide = !vars.hide;'></span>
      `)
    await nextTick()
    console.log(wrapper.html())

    {
      const btn1: any = wrapper.find('#btn1')
      await btn1.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('123')
      expect(wrapper.find('h2').text()).toEqual('123')
      expect(wrapper.find('h4').text()).toEqual('2')
    }
    {
      const btn3: any = wrapper.find('#btn3') // stopWatch
      await btn3.trigger('click')

      const btn2: any = wrapper.find('#btn2')
      await btn2.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('234')
      expect(wrapper.find('h2').text()).toEqual('123')
      expect(wrapper.find('h4').text()).toEqual('2')
    }
    {
      const span: any = wrapper.find('span')
      await span.trigger('click')
      console.log('should unmounted')

      const btn2: any = wrapper.find('#btn2')
      await btn2.trigger('click')
      expect(wrapper.find('h1').text()).toEqual('234')
      expect(wrapper.find('h2').text()).toEqual('123')
      expect(wrapper.find('h4').text()).toEqual('2')
    }
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
  it('computed', async () => {
    const wrapper = mountTemplate(`
      <go-plaid-scope :init='{hello: "555"}' v-slot="{locals}">
        <div v-on-mounted="({computed}) => {
          locals.computedExample = computed(() => {
            return (locals.hello || '') + '_xxx';
          })
        }" />
        <h1>{{locals.computedExample}}</h1>
        <button id="btn1" @click='locals.hello = "123";' />
      </go-plaid-scope>
    `)
    await nextTick()
    console.log(wrapper.html())
    expect(wrapper.find('h1').text()).toEqual('555_xxx')
    const btn1: any = wrapper.find('#btn1')
    await btn1.trigger('click')
    expect(wrapper.find('h1').text()).toEqual('123_xxx')
  })
})
