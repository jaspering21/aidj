import { describe, it, expect } from 'vitest'
import {
  safeError,
  withErrorHandling,
  validateString,
  validateStringLength,
  validateNumber,
  validateNumberRange,
  validateEnum,
  safeJsonParse
} from './errors'

describe('errors.ts', () => {
  describe('safeError()', () => {
    it('returns 400 message for status 400', () => {
      const result = safeError('something went wrong', 400)
      expect(result).toEqual({ success: false, error: 'Invalid request format' })
    })

    it('returns 401 message for status 401', () => {
      const result = safeError('something went wrong', 401)
      expect(result).toEqual({ success: false, error: 'Authentication required' })
    })

    it('returns 403 message for status 403', () => {
      const result = safeError('something went wrong', 403)
      expect(result).toEqual({ success: false, error: 'Access denied' })
    })

    it('returns 404 message for status 404', () => {
      const result = safeError('something went wrong', 404)
      expect(result).toEqual({ success: false, error: 'Resource not found' })
    })

    it('returns 500 message for status 500', () => {
      const result = safeError('something went wrong', 500)
      expect(result).toEqual({ success: false, error: 'Service temporarily unavailable' })
    })

    it('returns default message for unknown status code', () => {
      const result = safeError('something went wrong', 418)
      expect(result).toEqual({ success: false, error: 'An error occurred' })
    })

    it('defaults to 500 status code', () => {
      const result = safeError('something went wrong')
      expect(result).toEqual({ success: false, error: 'Service temporarily unavailable' })
    })
  })

  describe('withErrorHandling()', () => {
    it('returns successful result when handler succeeds', async () => {
      const handler = withErrorHandling(async () => {
        return { success: true, data: { message: 'hello' } }
      })

      const result = await handler()
      expect(result).toEqual({ success: true, data: { message: 'hello' } })
    })

    it('returns safe error when handler throws', async () => {
      const handler = withErrorHandling(async () => {
        throw new Error('Internal error details')
      })

      const result = await handler()
      expect(result).toEqual({ success: false, error: 'Service temporarily unavailable' })
    })

    it('returns safe error when handler returns error response', async () => {
      const handler = withErrorHandling(async () => {
        return { success: false, error: 'Some error' }
      })

      const result = await handler()
      expect(result).toEqual({ success: false, error: 'Some error' })
    })

    it('wraps handler without calling it immediately', async () => {
      let called = false
      const handler = withErrorHandling(async () => {
        called = true
        return { success: true, data: {} }
      })

      expect(called).toBe(false)
      await handler()
      expect(called).toBe(true)
    })
  })

  describe('validateString()', () => {
    it('returns null for valid string', () => {
      const result = validateString('hello', 'name')
      expect(result).toBeNull()
    })

    it('returns error for empty string', () => {
      const result = validateString('', 'name')
      expect(result).toBe('Invalid name')
    })

    it('returns error for whitespace-only string', () => {
      const result = validateString('   ', 'name')
      expect(result).toBe('Invalid name')
    })

    it('returns error for null', () => {
      const result = validateString(null, 'name')
      expect(result).toBe('Invalid name')
    })

    it('returns error for undefined', () => {
      const result = validateString(undefined, 'name')
      expect(result).toBe('Invalid name')
    })

    it('returns error for number', () => {
      const result = validateString(123, 'name')
      expect(result).toBe('Invalid name')
    })

    it('returns error for object', () => {
      const result = validateString({ value: 'test' }, 'name')
      expect(result).toBe('Invalid name')
    })
  })

  describe('validateStringLength()', () => {
    it('returns true for string within default bounds', () => {
      const result = validateStringLength('hello')
      expect(result).toBe(true)
    })

    it('returns true for string at exact min boundary', () => {
      const result = validateStringLength('a', 1, 10)
      expect(result).toBe(true)
    })

    it('returns true for string at exact max boundary', () => {
      const result = validateStringLength('abcdefghij', 1, 10)
      expect(result).toBe(true)
    })

    it('returns false for string below min boundary', () => {
      const result = validateStringLength('', 1, 10)
      expect(result).toBe(false)
    })

    it('returns false for string above max boundary', () => {
      const result = validateStringLength('abcdefghijk', 1, 10)
      expect(result).toBe(false)
    })

    it('returns false for non-string value', () => {
      const result = validateStringLength(12345)
      expect(result).toBe(false)
    })

    it('returns true for empty string when min is 0', () => {
      const result = validateStringLength('', 0, 10)
      expect(result).toBe(true)
    })

    it('handles custom min and max', () => {
      expect(validateStringLength('abc', 3, 5)).toBe(true)
      expect(validateStringLength('ab', 3, 5)).toBe(false)
      expect(validateStringLength('abcdef', 3, 5)).toBe(false)
    })
  })

  describe('validateNumber()', () => {
    it('returns number for valid number input', () => {
      const result = validateNumber(42, 'count')
      expect(result).toBe(42)
    })

    it('returns parsed number for valid number string', () => {
      const result = validateNumber('123', 'count')
      expect(result).toBe(123)
    })

    it('returns null for NaN', () => {
      const result = validateNumber(NaN, 'count')
      expect(result).toBeNull()
    })

    it('returns null for non-numeric string', () => {
      const result = validateNumber('hello', 'count')
      expect(result).toBeNull()
    })

    it('returns null for null input', () => {
      const result = validateNumber(null, 'count')
      expect(result).toBeNull()
    })

    it('returns null for undefined input', () => {
      const result = validateNumber(undefined, 'count')
      expect(result).toBeNull()
    })

    it('returns null for object input', () => {
      const result = validateNumber({ value: 42 }, 'count')
      expect(result).toBeNull()
    })

    it('parses negative numbers correctly', () => {
      const result = validateNumber('-5', 'count')
      expect(result).toBe(-5)
    })

    it('parses decimal numbers correctly', () => {
      const result = validateNumber('3.14', 'count')
      expect(result).toBe(3)
    })
  })

  describe('validateNumberRange()', () => {
    it('returns true for number within range', () => {
      const result = validateNumberRange(5, 0, 10)
      expect(result).toBe(true)
    })

    it('returns true for number at exact min boundary', () => {
      const result = validateNumberRange(0, 0, 10)
      expect(result).toBe(true)
    })

    it('returns true for number at exact max boundary', () => {
      const result = validateNumberRange(10, 0, 10)
      expect(result).toBe(true)
    })

    it('returns false for number below min', () => {
      const result = validateNumberRange(-1, 0, 10)
      expect(result).toBe(false)
    })

    it('returns false for number above max', () => {
      const result = validateNumberRange(11, 0, 10)
      expect(result).toBe(false)
    })

    it('returns false for NaN', () => {
      const result = validateNumberRange(NaN, 0, 10)
      expect(result).toBe(false)
    })

    it('returns false for non-number', () => {
      const result = validateNumberRange('hello', 0, 10)
      expect(result).toBe(false)
    })

    it('handles number string conversion', () => {
      expect(validateNumberRange('5', 0, 10)).toBe(true)
      expect(validateNumberRange('15', 0, 10)).toBe(false)
    })

    it('handles undefined max (no upper bound)', () => {
      expect(validateNumberRange(100, 0)).toBe(true)
      expect(validateNumberRange(-50, 0)).toBe(false)
    })
  })

  describe('validateEnum()', () => {
    it('returns true for value in allowed list', () => {
      const result = validateEnum('apple', ['apple', 'banana', 'cherry'])
      expect(result).toBe(true)
    })

    it('returns false for value not in allowed list', () => {
      const result = validateEnum('grape', ['apple', 'banana', 'cherry'])
      expect(result).toBe(false)
    })

    it('returns false for non-string value', () => {
      const result = validateEnum(123, ['apple', 'banana', 'cherry'])
      expect(result).toBe(false)
    })

    it('returns false for empty allowed list', () => {
      const result = validateEnum('apple', [])
      expect(result).toBe(false)
    })

    it('is case-sensitive', () => {
      expect(validateEnum('Apple', ['apple', 'banana'])).toBe(false)
    })
  })

  describe('safeJsonParse()', () => {
    it('returns parsed JSON for valid JSON string', () => {
      const result = safeJsonParse('{"name":"test"}', {})
      expect(result).toEqual({ name: 'test' })
    })

    it('returns fallback for invalid JSON', () => {
      const result = safeJsonParse('not valid json', { default: true })
      expect(result).toEqual({ default: true })
    })

    it('returns fallback for empty string', () => {
      const result = safeJsonParse('', { fallback: true })
      expect(result).toEqual({ fallback: true })
    })

    it('returns null for null JSON (valid JSON)', () => {
      const result = safeJsonParse('null', { fallback: true })
      expect(result).toBeNull()
    })

    it('returns fallback for malformed JSON', () => {
      const result = safeJsonParse('{invalid}', { fallback: true })
      expect(result).toEqual({ fallback: true })
    })

    it('parses arrays correctly', () => {
      const result = safeJsonParse('[1,2,3]', [])
      expect(result).toEqual([1, 2, 3])
    })

    it('returns typed fallback', () => {
      const result = safeJsonParse('invalid', 'fallback string')
      expect(result).toBe('fallback string')
    })

    it('returns number fallback', () => {
      const result = safeJsonParse('invalid', 42)
      expect(result).toBe(42)
    })
  })
})