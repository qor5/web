import { computed, reactive } from 'vue'
import { setFormValue } from '@/utils'

export function formField(fd: FormData, name: string, value: any) {
  setFormValue(fd, name, value)
  const r = computed({
    get() {
      console.log('formField get', fd, name, fd.getAll(name))
      if (Array.isArray(value)) {
        return fd.getAll(name)
      }
      return fd.get(name)
    },
    set(newValue) {
      console.log('formField set', fd, name, newValue)
      setFormValue(fd, name, newValue)
    }
  })
  return reactive({ model: r })
}
