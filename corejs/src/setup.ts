import type { App } from 'vue'
import { GoPlaidPortal } from '@/portal'
import GoPlaidScope from '@/scope'
import { initContext } from '@/initContext'
import { fieldNameDirective } from '@/fieldname'
import debounce from '@/debounce'
import { keepScroll } from '@/keepScroll'
import { Builder, plaid } from '@/builder'
// import GlobalEvents from 'vue-global-events'

export function setup(app: App<Element>, form: FormData) {
  app.component('GoPlaidPortal', GoPlaidPortal())
  app.component('GoPlaidScope', GoPlaidScope)
  // app.component('GlobalEvents', GlobalEvents);
  app.directive('init-context', initContext())
  app.directive('field-name', fieldNameDirective(form))
  app.directive('debounce', debounce)
  app.directive('keep-scroll', keepScroll())

  app.mixin({
    mounted() {
      window.addEventListener('fetchStart', (e: Event) => {
        ;(this as any).isFetching = true
      })
      window.addEventListener('fetchEnd', (e: Event) => {
        ;(this as any).isFetching = false
      })
    },
    data() {
      return {
        isFetching: false,
        plaidForm: form
      }
    },
    methods: {
      $plaid: function (): Builder {
        return plaid()
          .vueContext(this)
          .form(form)
          .vars((this as any).vars)
      }
    }
  })
}
