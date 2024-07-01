import { describe, expect, it } from 'vitest'
import { mountTemplate } from './testutils'
import { defineComponent, nextTick } from 'vue'

describe('scope', () => {
  it('scope init can be array or object', async () => {
    const wrapper = mountTemplate(`
      <div>
        <go-plaid-actionable :factory='(b) { 
            return b.compoType("*examples.TodoApp").
                     compoState({"id": "TodoApp0", "visibility": "active"}.
                     injector("top").
                     syncQuery(true).
                     queryTags({
                        "name": "visibility",
                        "json_name": "visibility",
                        "omitempty": false,
                        "cookie": true
                     })
        }' v-slot="{ action: action1 }">
            <go-plaid-observer @v-on:NotifyTodosChanged='function({notificationName, payload}) { 
                action().
                method("OnReload").
                request({ title: $event.target.value }).
                go() }'>
            </go-plaid-observer>
            
            <go-plaid-actionable :factory='(b) { 
            return b.compoType("*examples.TodoApp").
                     compoState({"id": "TodoApp0", "visibility": "active"}.
                     injector("top").
                     syncQuery(true).
                     queryTags({
                        "name": "visibility",
                        "json_name": "visibility",
                        "omitempty": false,
                        "cookie": true
                     })
        }' v-slot="{ action: __actionable_2__ }">
            <go-plaid-observer notification-name='NotifyTodosChanged' :handler='function({notificationName, payload}) { 
                __actionable_1__().
                method("OnReload").
                request({ title: $event.target.value }).
                go() }'>
            </go-plaid-observer>
        </go-plaid-actionable>      
        </go-plaid-actionable>      
      </div>
      `)

    await nextTick()
    console.log(wrapper.html())

  })

})
