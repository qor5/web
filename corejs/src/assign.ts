import { type Directive } from 'vue'

export const assignOnMounted: Directive = {
  mounted: (_, binding) => {
    const [form, obj] = binding.value
    Object.assign(form, obj)
  }
}

export const assignModelOnMounted: Directive = {
  mounted: (_, binding) => {
    const [form, obj] = binding.value
    // Object.assign(form, obj)
    const keyArray = Object.keys(obj)
    keyArray.forEach((key) => {
      const value = obj[key]
      if (typeof value === 'object' && value !== null) {
        form[key] = JSON.parse(JSON.stringify(value))
      } else {
        form[key] = value
      }
    })
  }
}
