// Service worker version
const CACHE_VERSION = "v1"
const CACHE_NAME = `ai-product-image-generator-${CACHE_VERSION}`

// Assets to cache on install
const STATIC_ASSETS = ["/", "/index.html", "/favicon.ico", "/manifest.json"]

// API endpoints to cache
const API_CACHE_URLS = ["https://storage.googleapis.com/tfjs-models/assets/mobilenet/imagenet_classes.json"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith("ai-product-image-generator-") && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      )
    }),
  )
})

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip cross-origin requests
  if (
    !event.request.url.startsWith(self.location.origin) &&
    !API_CACHE_URLS.some((url) => event.request.url.startsWith(url))
  ) {
    return
  }

  // Handle API requests with network-first strategy
  if (API_CACHE_URLS.some((url) => event.request.url.startsWith(url))) {
    event.respondWith(networkFirstStrategy(event.request))
    return
  }

  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirstStrategy(event.request))
})

// Cache-first strategy
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    // If both cache and network fail, return a fallback
    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

// Network-first strategy
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // If both network and cache fail, return a fallback
    return new Response("Network error happened", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
