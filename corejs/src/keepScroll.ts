import type { ObjectDirective } from 'vue'
import qs from 'query-string'
import debounce from 'lodash/debounce'

export const keepScroll: ObjectDirective = {
  mounted: (el, binding, vnode) => {
    let myel = el
    if (vnode.component) {
      myel = vnode.component?.proxy?.$el as HTMLElement
    }
    const param = binding.arg || 'scroll'
    const initParsed = qs.parse(location.hash)
    const values = initParsed[param]
    let value = ''
    if (Array.isArray(values)) {
      value = values[0] || ''
    } else {
      value = values || ''
    }

    const xy = value.split('_')
    if (xy.length >= 2) {
      myel.scrollTop = parseInt(xy[0])
      myel.scrollLeft = parseInt(xy[1])
    }

    myel.addEventListener(
      'scroll',
      debounce(function () {
        const parsed = qs.parse(location.hash)
        parsed[param] = myel.scrollTop + '_' + myel.scrollLeft
        location.hash = qs.stringify(parsed)
      }, 200)
    )
  }
}
