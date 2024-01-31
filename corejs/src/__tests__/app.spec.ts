import { describe, it, expect } from 'vitest'
import { createWebApp } from '../app'
import { nextTick } from 'vue'

describe('app', () => {
  it('createWebApp', async () => {
    const app = createWebApp(`<h1 @click='$plaid().fieldValue("a", 1)'></h1>`)
    const div = document.createElement('div')
    app.mount(div)
    await nextTick()
    div.querySelector('h1')?.click()

    console.log(div.innerHTML)
  })
})
