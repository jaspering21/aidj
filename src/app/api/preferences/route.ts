import { NextResponse } from 'next/server'
import { getPreferences, savePreferences, UserPreferences } from '@/lib/preferences'

export async function GET(): Promise<NextResponse> {
  try {
    const prefs = getPreferences()
    return NextResponse.json({ success: true, data: prefs })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load preferences' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const prefs = savePreferences(body as Partial<UserPreferences>)
    return NextResponse.json({ success: true, data: prefs })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save preferences' },
      { status: 500 }
    )
  }
}