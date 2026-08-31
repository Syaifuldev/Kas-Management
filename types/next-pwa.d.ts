declare module 'next-pwa' {
  import type { NextConfig } from 'next'

  interface PWAConfig {
    dest?: string
    disable?: boolean
    register?: boolean
    skipWaiting?: boolean
    scope?: string
    sw?: string
    buildExcludes?: (string | RegExp)[]
    fallbacks?: {
      document?: string
      image?: string
      audio?: string
      video?: string
      font?: string
    }
    cacheOnFrontEndNav?: boolean
    reloadOnOnline?: boolean
    publicExcludes?: string[]
    runtimeCaching?: object[]
  }

  function withPWA(config?: PWAConfig): (nextConfig: NextConfig) => NextConfig

  export = withPWA
}
