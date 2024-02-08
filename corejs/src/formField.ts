import { computed, reactive } from 'vue'
import { setFormValue } from '@/utils'

export function formField(fd: FormData, name: string, value: any) {
  setFormValue(fd, name, value)
  const r = computed({
    get() {
      return fd.get(name)
    },
    set(newValue) {
      setFormValue(fd, name, newValue)
    }
  })
  return reactive({ model: r })
}
