import { createWebApp } from '@/app'

const appElement = document.getElementById('app')
if (!appElement) {
  throw new Error('#app required')
}

declare let window: any

const vueOptions = {}
const app = createWebApp(appElement.innerHTML)

for (const registerComp of window.__goplaidVueComponentRegisters || []) {
  registerComp(app, vueOptions)
}

app.mount('#app')
