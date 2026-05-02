import { NextRequest, NextResponse } from 'next/server'
import { getWelcomeRecommendation, getNextSong } from '@/lib/recommendations'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'welcome') {
    const weatherParam = searchParams.get('weather')
    const hourParam = searchParams.get('hour')

    if (!weatherParam || !hourParam) {
      return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 })
    }

    try {
      const weather = JSON.parse(weatherParam)
      const hour = parseInt(hourParam, 10)
      const rec = getWelcomeRecommendation(weather, hour)
      return NextResponse.json({ success: true, data: rec })
    } catch (error) {
      return NextResponse.json({ success: false, error: 'Failed to generate recommendation' }, { status: 500 })
    }
  }

  if (action === 'next') {
    const excludeParam = request.nextUrl.searchParams.get('excludeIds')
    const excludeIds = excludeParam ? JSON.parse(excludeParam) : []
    const rec = getNextSong(excludeIds)
    return NextResponse.json({ success: true, data: rec })
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
}