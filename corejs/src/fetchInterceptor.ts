declare let window: any

export type FetchInterceptor = {
  onRequest?: (id: string, resource: RequestInfo | URL, config?: RequestInit) => void
  onResponse?: (id: string, response: Response, resource: RequestInfo, config?: RequestInit) => void
}

// Global Map to store the mapping between request ID and Request info
const requestMap = new Map<string, { resource: RequestInfo | URL; config?: RequestInit }>()

// Function to generate a unique identifier (you can use a more complex strategy if needed)
const generateUniqueId = (): string => {
  return Math.random().toString(36).substr(2, 9) // Simple unique ID generation
}

const originalFetch: typeof window.fetch = window.fetch

export function initFetchInterceptor(customInterceptor: FetchInterceptor) {
  // do not rewrite fetch in test env
  if(typeof window.__vitest_environment__ !== 'undefined') return

  // eslint-disable-next-line no-debugger
  window.fetch = async function (
    ...args: [RequestInfo | URL, init?: RequestInit]
  ): Promise<Response> {
    const [resource, config] = args

    // Generate a unique ID for the request
    const requestId = generateUniqueId()

    // Store the request info in the Map
    requestMap.set(requestId, { resource, config })

    // Execute the request phase callback if provided
    if (customInterceptor.onRequest) {
      customInterceptor.onRequest(requestId, resource, config)
    }

    try {
      // Call the original fetch method to get the response
      const response = await originalFetch(...args)

      // Find the corresponding request info during the response phase
      const requestInfo = requestMap.get(requestId)

      // Execute the response phase callback if provided
      if (customInterceptor.onResponse && requestInfo) {
        // Ensure resource is of type RequestInfo before passing to onResponse
        const resource =
          requestInfo.resource instanceof URL
            ? requestInfo.resource.toString()
            : requestInfo.resource

        customInterceptor.onResponse(requestId, response, resource, requestInfo.config)
      }

      // After the request is completed, remove the request info from the Map
      requestMap.delete(requestId)

      // Return the original response
      return response
    } catch (error) {
      // Handle fetch errors
      console.error('Fetch error:', error)

      // In case of request failure, also remove the request info from the Map
      requestMap.delete(requestId)

      throw error // Rethrow the error
    }
  }
}
