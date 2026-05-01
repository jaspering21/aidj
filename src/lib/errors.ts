/**
 * Shared error handling utilities for AIDJ API routes
 * Ensures consistent error responses and prevents internal detail leakage
 */

export interface ApiError {
  success: false
  error: string
}

/**
 * Creates a safe error response that never exposes internal details
 */
export function safeError(message: string, statusCode: number = 500): { success: false; error: string } {
  // Map to user-friendly messages - never expose raw error details
  const safeMessages: Record<string, string> = {
    400: 'Invalid request format',
    401: 'Authentication required',
    403: 'Access denied',
    404: 'Resource not found',
    500: 'Service temporarily unavailable',
  }

  return {
    success: false,
    error: safeMessages[String(statusCode)] || 'An error occurred',
  }
}

/**
 * Wraps async route handlers with consistent error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<{ success: true; data: T } | ApiError>
): () => Promise<ApiError | { success: true; data: T }> {
  return async () => {
    try {
      const result = await handler()
      return result
    } catch {
      return safeError('Service temporarily unavailable', 500)
    }
  }
}

/**
 * Validates required string fields
 */
export function validateString(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `Invalid ${fieldName}`
  }
  return null
}

/**
 * Validates string with length constraints
 */
export function validateStringLength(value: unknown, min: number = 1, max: number = 500): boolean {
  return typeof value === 'string' && value.length >= min && value.length <= max
}

/**
 * Validates required number fields
 */
export function validateNumber(value: unknown, fieldName: string): number | null {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (isNaN(num)) {
    return null
  }
  return num
}

/**
 * Validates number with min/max constraints
 */
export function validateNumberRange(value: unknown, min: number = 0, max?: number): boolean {
  const num = typeof value === 'number' ? value : parseInt(String(value), 10)
  if (isNaN(num)) return false
  if (num < min) return false
  if (max !== undefined && num > max) return false
  return true
}

/**
 * Validates enum value against allowed list
 */
export function validateEnum(value: unknown, allowed: string[]): boolean {
  return typeof value === 'string' && allowed.includes(value)
}

/**
 * Safe JSON parser that never throws
 */
export function safeJsonParse<T>(data: string, fallback: T): T {
  try {
    return JSON.parse(data) as T
  } catch {
    return fallback
  }
}