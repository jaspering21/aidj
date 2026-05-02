'use client'

interface RecommendationContext {
  songId: string
  songName: string
  artist: string
  mood: string
  reason: string
  weatherContext: string
  youtubeId?: string
  youtubeUrl?: string
  neteaseUrl?: string
}

interface NowPlayingProps {
  recommendation: RecommendationContext | null
  progress: number
  favoriteIds: Set<string>
  onToggleFavorite: (songId: string, songName: string, artist: string) => void
}

export default function NowPlaying({ recommendation, progress, favoriteIds, onToggleFavorite }: NowPlayingProps) {
  const isFav = recommendation ? favoriteIds.has(recommendation.songId) : false

  return (
    <div className="now-playing">
      <h2 className="now-playing-title">
        {recommendation?.songName || '---'}
      </h2>
      <p className="now-playing-artist">
        {recommendation?.artist || '未知歌手'}
      </p>

      <div className="now-playing-progress">
        <div
          className="now-playing-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="now-playing-meta">
        <span>{Math.round(progress)}%</span>
        <span>{recommendation?.mood || ''}</span>
      </div>

      {recommendation?.songId && (
        <button
          className={`now-playing-fav ${isFav ? 'active' : ''}`}
          onClick={() => onToggleFavorite(recommendation.songId, recommendation.songName, recommendation.artist)}
        >
          {isFav ? '♥ 已收藏' : '♡ 收藏'}
        </button>
      )}
    </div>
  )
}