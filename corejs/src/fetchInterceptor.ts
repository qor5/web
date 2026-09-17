import { generateUniqueId } from '@/utils'
declare let window: any

export type FetchInterceptor = {
  onRequest?: (id: string, resource: RequestInfo | URL, config?: RequestInit) => void
  onResponse?: (id: string, response: Response, resource: RequestInfo, config?: RequestInit) => void
  onError?: (error: unknown, id: string, resource?: RequestInfo) => void
}

// Global Map to store the mapping between request ID and Request info
const requestMap = new Map<string, { resource: RequestInfo | URL; config?: RequestInit }>()

const originalFetch: typeof window.fetch = window.fetch

function isCrossOrigin(resource: RequestInfo | URL): boolean {
  let urlStr: string
  if (typeof resource === 'string') {
    urlStr = resource
  } else if (resource instanceof URL) {
    urlStr = resource.toString()
  } else if (typeof Request !== 'undefined' && resource instanceof Request) {
    urlStr = resource.url
  } else {
    return false
  }
  try {
    const url = new URL(urlStr, window.location.href)
    return url.origin !== window.location.origin
  } catch {
    return false
  }
}

function notifyResponse(
  requestId: string,
  response: Response,
  customInterceptor: FetchInterceptor
) {
  const requestInfo = requestMap.get(requestId)
  if (customInterceptor.onResponse && requestInfo) {
    const resource =
      requestInfo.resource instanceof URL ? requestInfo.resource.toString() : requestInfo.resource
    customInterceptor.onResponse(requestId, response, resource, requestInfo.config)
  }
  requestMap.delete(requestId)
}

export function initFetchInterceptor(customInterceptor: FetchInterceptor) {
  // Do not rewrite fetch in the test env. The specs install their own
  // `global.fetch` mock, and this wrapper closes over `originalFetch` as it
  // was at module-load time — i.e. the real one — so wrapping would route
  // every request past the mock and out to undici.
  //
  // The sentinel is Vite's own `import.meta.env.MODE`: 'test' under vitest
  // (3 and 4 alike) and statically replaced with the build mode in the
  // browser bundle, so this branch is dead code there. It replaces
  // `window.__vitest_environment__`, which vitest 4 no longer defines —
  // that guard did not error, it just stopped firing.
  if (import.meta.env.MODE === 'test') return

  // eslint-disable-next-line no-debugger
  window.fetch = async function (
    ...args: [RequestInfo | URL, init?: RequestInit]
  ): Promise<Response> {
    const [resource, config] = args

    // Skip cross-origin requests (e.g. Google Analytics): we have no insight
    // into them and forcing a JSON parse on their bodies just produces noise.
    if (isCrossOrigin(resource)) {
      return originalFetch(...args)
    }

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

      // Clone the response to preserve the original response for further use
      const clonedResponse = response.clone()

      // Start processing the response body without waiting. A non-JSON or
      // empty body is not an error — only the request lifecycle matters here.
      clonedResponse
        .json()
        .catch(() => undefined)
        .finally(() => {
          notifyResponse(requestId, response, customInterceptor)
        })

      // Return the original response
      return response
    } catch (error) {
      errorHandler(error, requestId, customInterceptor)

      throw error // Rethrow the error
    }
  }
}

function errorHandler(error: unknown, requestId: string, customInterceptor: FetchInterceptor) {
  const requestInfo = requestMap.get(requestId)

  if (customInterceptor.onError && requestInfo) {
    const resource =
      requestInfo.resource instanceof URL ? requestInfo.resource.toString() : requestInfo.resource

    customInterceptor.onError(error, requestId, resource)
  }

  // In case of request failure, also remove the request info from the Map
  requestMap.delete(requestId)
}
