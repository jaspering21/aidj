'use client'

import { motion } from 'framer-motion'
import { FiSkipBack, FiSkipForward, FiPlay, FiPause, FiShuffle, FiRepeat } from 'react-icons/fi'

interface PlayControlsProps {
  isPlaying: boolean
  progress: number
  shuffleOn: boolean
  repeatMode: 'off' | 'one' | 'all'
  onPlayPause: () => void
  onPrev: () => void
  onNext: () => void
  onShuffle: () => void
  onRepeat: () => void
  onSeek: (progress: number) => void
}

export default function PlayControls({
  isPlaying,
  progress,
  shuffleOn,
  repeatMode,
  onPlayPause,
  onPrev,
  onNext,
  onShuffle,
  onRepeat,
  onSeek,
}: PlayControlsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-8"
    >
      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-primary"
          style={{
            background: `linear-gradient(to right, #6366F1 ${progress}%, #374151 ${progress}%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1:24</span>
          <span>4:02</span>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onShuffle}
          className={`p-2 transition-colors ${shuffleOn ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <FiShuffle size={18} />
        </button>

        <button onClick={onPrev} className="p-2 text-gray-300 hover:text-white transition-colors">
          <FiSkipBack size={24} />
        </button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onPlayPause}
          className="p-4 bg-primary rounded-full text-white shadow-lg shadow-primary/30"
        >
          {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} className="ml-1" />}
        </motion.button>

        <button onClick={onNext} className="p-2 text-gray-300 hover:text-white transition-colors">
          <FiSkipForward size={24} />
        </button>

        <button
          onClick={onRepeat}
          className={`p-2 transition-colors relative ${repeatMode !== 'off' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <FiRepeat size={18} />
          {repeatMode === 'one' && (
            <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
          )}
        </button>
      </div>
    </motion.section>
  )
}
