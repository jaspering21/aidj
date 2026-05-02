'use client'

interface ClockProps {
  currentTime: string
  currentDate: string
  isPlaying: boolean
}

export default function Clock({ currentTime, currentDate, isPlaying }: ClockProps) {
  return (
    <div className="clock-wrapper">
      <div className="clock-glow" />
      <div className="clock-digit">
        {currentTime || '00:00:00'}
      </div>
      <div className="clock-date-row">
        <span className="clock-date">{currentDate}</span>
        <div className="clock-status">
          <div className="clock-status-dot" />
          <span className="clock-status-text">{isPlaying ? 'ON AIR' : 'STANDBY'}</span>
        </div>
      </div>
    </div>
  )
}