'use client'

interface PlaylistItem {
  id: string
  songName: string
  artist: string
}

interface PlaylistPanelProps {
  playlist: PlaylistItem[]
  currentIndex: number
  isPlaying: boolean
  favoriteIds: Set<string>
  onPlaySong: (item: PlaylistItem, idx: number) => void
  onToggleFavorite: (songId: string, songName: string, artist: string) => void
}

export default function PlaylistPanel({
  playlist,
  currentIndex,
  isPlaying,
  favoriteIds,
  onPlaySong,
  onToggleFavorite
}: PlaylistPanelProps) {
  return (
    <div>
      <div className="queue-header">
        <p className="hud-label">PLAYLIST</p>
        <div className="queue-badge">
          <span>今日专属</span>
        </div>
      </div>

      <div className="queue-list">
        {playlist.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => onPlaySong(item, idx)}
            className={`queue-item ${currentIndex === idx ? 'active' : ''}`}
          >
            <span className="queue-item-number">{String(idx + 1).padStart(2, '0')}</span>

            <div className="queue-item-info">
              <p className="queue-item-title">{item.songName}</p>
              <p className="queue-item-artist">{item.artist}</p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(item.id, item.songName, item.artist)
              }}
              className={`queue-item-fav ${favoriteIds.has(item.id) ? 'active' : ''}`}
            >
              {favoriteIds.has(item.id) ? '♥' : '♡'}
            </button>

            {currentIndex === idx && isPlaying && (
              <div className="queue-item-wave">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}