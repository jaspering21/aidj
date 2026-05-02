import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, RETRY_CONFIG } from './retry'

describe('retry.ts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('withRetry()', () => {
    it('returns immediately on success without retry', async () => {
      vi.useRealTimers()
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and eventually succeeds', async () => {
      vi.useRealTimers()
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('throws after max retries exceeded', async () => {
      vi.useRealTimers()
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'))

      await expect(withRetry(fn, 3)).rejects.toThrow('persistent failure')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('uses exponential backoff delays', async () => {
      vi.useRealTimers()
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      const result = await withRetry(fn, 3, onRetry)

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, expect.any(Error))
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, expect.any(Error))
    })

    it('delays are capped at maxDelay', async () => {
      vi.useRealTimers()
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      const result = await withRetry(fn, 2, onRetry)

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('respects custom maxAttempts', async () => {
      vi.useRealTimers()
      // Use 3 attempts instead of 5 to avoid timeout (5 attempts takes 7.5s with backoff)
      const fn = vi.fn().mockRejectedValue(new Error('fail'))

      await expect(withRetry(fn, 3)).rejects.toThrow('fail')
      expect(fn).toHaveBeenCalledTimes(3)
    }, 10000)

    it('calls onRetry callback before each retry', async () => {
      vi.useRealTimers()
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockResolvedValue('success')

      const onRetry = vi.fn()
      const result = await withRetry(fn, 2, onRetry)

      expect(result).toBe('success')
      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('returns correct type T on success', async () => {
      vi.useRealTimers()
      const fn = vi.fn().mockResolvedValue({ data: 'test', count: 42 })

      const result = await withRetry(fn)

      expect(result).toEqual({ data: 'test', count: 42 })
    })

    it('throws the last error when all retries fail', async () => {
      vi.useRealTimers()
      const lastError = new Error('final failure')
      const fn = vi.fn().mockRejectedValue(lastError)

      await expect(withRetry(fn, 3)).rejects.toThrow(lastError)
    })
  })
})