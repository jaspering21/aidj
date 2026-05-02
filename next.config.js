const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

const sentryConfig = {
  // Silent during build if DSN not configured
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableClientWebpackPlugin: true,
  disableServerWebpackPlugin: true,
}

module.exports = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryConfig)
  : nextConfig
