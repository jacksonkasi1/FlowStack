import { createRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { initClientMonitoring } from './lib/monitoring'

// Create a new router instance
export const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  })

  if (!router.isServer) initClientMonitoring(router)

  return router
}
