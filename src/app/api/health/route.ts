import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const timestamp = new Date().toISOString()
    const version = process.env.npm_package_version || '1.0.0'

    return NextResponse.json({
      status: 'ok',
      timestamp,
      version
    })
  } catch (err) {
    console.error('Health check failed:', err)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }, { status: 503 })
  }
}