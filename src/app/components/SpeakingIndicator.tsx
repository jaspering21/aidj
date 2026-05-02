'use client'

interface SpeakingIndicatorProps {
  isAIDJSpeaking: boolean
}

export default function SpeakingIndicator({ isAIDJSpeaking }: SpeakingIndicatorProps) {
  if (!isAIDJSpeaking) return null

  return (
    <div className="speaking-indicator">
      <div className="speaking-indicator-wave">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <span className="speaking-indicator-text">AIDJ 在说话...</span>
    </div>
  )
}