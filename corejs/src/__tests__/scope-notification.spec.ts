import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'
import GoPlaidScope from '../go-plaid-scope.vue'

describe('scope notification', () => {
  const provideVars = reactive({
    __notification: {}
  })

  const mockPlaid = vi.fn()

  const observers = [
    {
      name: 'operationCompleted',
      script: `console.log('Operation completed with payload:', payload);`
    }
  ]

  const createWrapper = (props = {}) => {
    return mount(GoPlaidScope, {
      props: {
        observers,
        ...props
      },
      global: {
        provide: {
          vars: provideVars,
          plaid: mockPlaid
        }
      },
      slots: {
        default: '<div></div>'
      }
    })
  }

  it('should execute observer script when notification is triggered', async () => {
    const wrapper = createWrapper()
    const consoleSpy = vi.spyOn(console, 'log')

    // send notification
    provideVars.__notification = {
      id: '1',
      name: 'operationCompleted',
      payload: { someData: 'value' }
    }

    await wrapper.vm.$nextTick()
    expect(consoleSpy).toHaveBeenCalledWith('Operation completed with payload:', {
      someData: 'value'
    })
    consoleSpy.mockRestore()
  })
})
