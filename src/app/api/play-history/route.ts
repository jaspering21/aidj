import { NextResponse } from 'next/server'
import { getPlayHistory, addToHistory, clearHistory, PlayHistoryEntry } from '@/lib/play-history'

export async function GET(): Promise<NextResponse> {
  try {
    const history = getPlayHistory()
    return NextResponse.json({ success: true, data: history })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load play history' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const entry: PlayHistoryEntry = {
      songId: body.songId,
      songName: body.songName,
      artist: body.artist,
      playedAt: body.playedAt
    }
    addToHistory(entry)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to add to play history' },
      { status: 500 }
    )
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    clearHistory()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to clear play history' },
      { status: 500 }
    )
  }
}