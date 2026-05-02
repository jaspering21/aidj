import { NextResponse } from 'next/server'
import { getFavorites, addFavorite, removeFavorite, FavoriteEntry } from '@/lib/favorites'

export async function GET(): Promise<NextResponse> {
  try {
    const favorites = getFavorites()
    return NextResponse.json({ success: true, data: favorites })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load favorites' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json()
    const entry: FavoriteEntry = {
      songId: body.songId,
      songName: body.songName,
      artist: body.artist,
      addedAt: body.addedAt || Date.now()
    }

    if (!entry.songId || !entry.songName || !entry.artist) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const added = addFavorite(entry)
    return NextResponse.json({ success: true, added })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('id')

    if (!songId) {
      return NextResponse.json(
        { success: false, error: 'Missing songId parameter' },
        { status: 400 }
      )
    }

    const removed = removeFavorite(songId)
    return NextResponse.json({ success: true, removed })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to remove favorite' },
      { status: 500 }
    )
  }
}