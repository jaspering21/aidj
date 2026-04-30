'use client'

import { motion } from 'framer-motion'

interface WeatherBackgroundProps {
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snowy'
}

const gradients = {
  sunny: 'from-orange-500/20 via-amber-500/10 to-transparent',
  cloudy: 'from-gray-600/20 via-slate-500/10 to-transparent',
  rainy: 'from-blue-600/20 via-cyan-500/10 to-transparent',
  snowy: 'from-slate-400/20 via-white-500/10 to-transparent',
}

export default function WeatherBackground({ weather }: WeatherBackgroundProps) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-br ${gradients[weather]} pointer-events-none`}>
      {/* Animated particles based on weather */}
      <motion.div
        animate={{
          y: [0, -20, 0],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl"
      />
      <motion.div
        animate={{
          y: [0, 20, 0],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/10 blur-3xl"
      />
      {weather === 'rainy' && (
        <>
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-20, window.innerHeight + 20],
                opacity: [0, 0.5, 0],
              }}
              transition={{
                duration: 1 + Math.random(),
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
              className="absolute w-0.5 h-4 bg-blue-300/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: 0,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
