'use client'

import { motion } from 'framer-motion'

interface Track {
  title: string
  artist: string
  album: string
  albumArt: string
  lyrics: string
  reason: string
}

interface MusicIntroProps {
  track: Track
}

export default function MusicIntro({ track }: MusicIntroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-surface/50 backdrop-blur-sm rounded-2xl p-5 border border-gray-800"
    >
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        <span>🎵</span>
        <span>Music Introduction</span>
      </div>

      {/* AI Recommendation Reason */}
      <div className="mb-4">
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-primary font-medium">AI 推荐：</span>
          {track.reason}
        </p>
      </div>

      {/* Lyrics Preview */}
      <div className="border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Lyrics</p>
        <p className="text-sm text-gray-400 italic leading-relaxed">
          {track.lyrics}...
        </p>
      </div>
    </motion.section>
  )
}
