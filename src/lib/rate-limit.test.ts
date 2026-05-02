import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkRateLimit, getClientIp, logRateLimitViolation, clearRateLimitStore } from './rate-limit'

// Mock Request class for testing
class MockHeaders {
  constructor(private headers: Map<string, string>) {}

  get(name: string): string | null {
    return this.headers.get(name) || null
  }
}

class MockRequest {
  constructor(headers: Map<string, string>) {
    this.headers = new MockHeaders(headers)
  }

  headers: MockHeaders
}

describe('rate-limit.ts', () => {
  beforeEach(() => {
    // Clear rate limit store before each test to ensure test isolation
    clearRateLimitStore()
  })

  describe('checkRateLimit()', () => {
    it('allows first request for an endpoint', () => {
      const result = checkRateLimit('192.168.1.1', '/api/aidj')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
      expect(result.resetMs).toBeGreaterThan(0)
    })

    it('allows requests under the limit', () => {
      // Make requests up to just under the limit
      const endpoint = '/api/aidj'
      const ip = '10.0.0.1'

      for (let i = 0; i < 29; i++) {
        const result = checkRateLimit(ip, endpoint)
        expect(result.allowed).toBe(true)
      }
    })

    it('blocks requests over the limit', () => {
      const endpoint = '/api/aidj'
      const ip = '10.0.0.2'

      // Use up the limit
      for (let i = 0; i < 30; i++) {
        checkRateLimit(ip, endpoint)
      }

      // This one should be blocked
      const result = checkRateLimit(ip, endpoint)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('returns -1 remaining for unconfigured endpoints', () => {
      const result = checkRateLimit('192.168.1.1', '/api/unknown')

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(-1)
      expect(result.resetMs).toBe(0)
    })

    it('has correct limit for netease-login endpoint', () => {
      const endpoint = '/api/netease-login'
      const ip = '10.0.0.3'

      // Use up the 10 request limit
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(ip, endpoint)
        expect(result.allowed).toBe(true)
      }

      const blocked = checkRateLimit(ip, endpoint)
      expect(blocked.allowed).toBe(false)
      expect(blocked.remaining).toBe(0)
    })

    it('has correct limit for netease-player endpoint', () => {
      const endpoint = '/api/netease-player'
      const ip = '10.0.0.4'

      // Use up the 60 request limit
      for (let i = 0; i < 60; i++) {
        const result = checkRateLimit(ip, endpoint)
        expect(result.allowed).toBe(true)
      }

      const blocked = checkRateLimit(ip, endpoint)
      expect(blocked.allowed).toBe(false)
    })

    it('tracks different IPs separately', () => {
      const endpoint = '/api/aidj'

      // Exhaust limit for IP1
      for (let i = 0; i < 30; i++) {
        checkRateLimit('192.168.1.100', endpoint)
      }

      // IP2 should still be allowed
      const result = checkRateLimit('192.168.1.101', endpoint)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(29)
    })

    it('tracks different endpoints separately', () => {
      const ip = '192.168.1.50'

      // Exhaust /api/aidj limit
      for (let i = 0; i < 30; i++) {
        checkRateLimit(ip, '/api/aidj')
      }

      // /api/netease-login should still have its own limit
      const result = checkRateLimit(ip, '/api/netease-login')
      expect(result.allowed).toBe(true)
    })
  })

  describe('getClientIp()', () => {
    it('returns IP from x-forwarded-for header', () => {
      const request = new MockRequest(new Map([
        ['x-forwarded-for', '203.0.113.195, 70.41.3.18, 150.172.238.178']
      ])) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })

    it('returns first IP from x-forwarded-for with leading/trailing spaces', () => {
      const request = new MockRequest(new Map([
        ['x-forwarded-for', '  203.0.113.195  ,  70.41.3.18  ']
      ])) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })

    it('prefers x-forwarded-for over x-real-ip', () => {
      const request = new MockRequest(new Map([
        ['x-forwarded-for', '203.0.113.195'],
        ['x-real-ip', '198.51.100.178']
      ])) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })

    it('returns IP from x-real-ip header when x-forwarded-for is absent', () => {
      const request = new MockRequest(new Map([
        ['x-real-ip', '198.51.100.178']
      ])) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('198.51.100.178')
    })

    it('returns "unknown" when no headers present', () => {
      const request = new MockRequest(new Map()) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('unknown')
    })

    it('handles single IP in x-forwarded-for', () => {
      const request = new MockRequest(new Map([
        ['x-forwarded-for', '203.0.113.195']
      ])) as unknown as Request

      const ip = getClientIp(request)
      expect(ip).toBe('203.0.113.195')
    })
  })

  describe('logRateLimitViolation()', () => {
    it('logs warning with ip and endpoint', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockReturnValue(undefined)

      logRateLimitViolation('192.168.1.100', '/api/aidj')

      expect(warnSpy).toHaveBeenCalledOnce()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[RateLimit]')
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('ip=192.168.1.100')
      )
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('endpoint=/api/aidj')
      )

      warnSpy.mockRestore()
    })
  })
})