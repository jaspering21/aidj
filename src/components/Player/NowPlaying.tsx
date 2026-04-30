'use client'

import { motion } from 'framer-motion'

interface Track {
  title: string
  artist: string
  album: string
  albumArt: string
}

interface NowPlayingProps {
  track: Track
}

export default function NowPlaying({ track }: NowPlayingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center"
    >
      <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">
        ♪ Now Playing ♪
      </div>
      <h1 className="text-2xl font-bold mb-1 gradient-text">{track.title}</h1>
      <p className="text-gray-400">{track.artist}</p>
    </motion.div>
  )
}
