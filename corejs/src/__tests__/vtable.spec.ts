import { describe, it, expect } from 'vitest'
import { nextTick, ref } from 'vue'
import { mockFetchWithReturnTemplate, mountTemplate, waitUntil } from './testutils'
import { flushPromises } from '@vue/test-utils'

describe('app', () => {
  it('plaid fieldValue', async () => {
    const form = ref(new FormData())

    mockFetchWithReturnTemplate(form, { body: '<h3></h3>' })
    const wrapper = mountTemplate(
      `  <v-table>
    <thead>
      <tr>
        <th class="text-left">
          Name
        </th>
        <th class="text-left">
          Calories
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
      >
        <td>xxxx</td>
        <td>yyyy</td>
      </tr>
    </tbody>
  </v-table>`
    )

    await nextTick()
    console.log('next tick' + wrapper.html())
  })
})
