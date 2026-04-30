'use client'

interface VisualizerProps {
  isPlaying: boolean
}

export default function Visualizer({ isPlaying }: VisualizerProps) {
  const bars = 5
  const heights = [40, 70, 50, 80, 60]

  return (
    <div className="flex items-end gap-1 h-12">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1 bg-gradient-to-t from-primary to-accent rounded-full ${isPlaying ? 'audio-bar' : ''}`}
          style={{
            height: isPlaying ? `${heights[i]}%` : '20%',
            animationDelay: `${i * 0.1}s`,
            animationDuration: `${0.5 + i * 0.1}s`
          }}
        />
      ))}
    </div>
  )
}
