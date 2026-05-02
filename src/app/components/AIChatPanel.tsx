'use client'

interface ChatMessage {
  role: 'user' | 'aidj'
  text: string
}

interface AIChatPanelProps {
  chatHistory: ChatMessage[]
  chatLoading: boolean
}

export default function AIChatPanel({ chatHistory, chatLoading }: AIChatPanelProps) {
  return (
    <div className="space-y-3">
      {chatHistory.length === 0 && !chatLoading && (
        <p className="chat-empty">与 AI DJ 对话...</p>
      )}

      {chatLoading && (
        <div className="chat-message ai">
          <span className="chat-message-role">DJ</span>
          <div className="chat-message-content">
            <div className="thinking-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}

      {chatHistory.map((msg, idx) => (
        <div key={idx} className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'}`}>
          <span className="chat-message-role">{msg.role === 'user' ? 'YOU' : 'DJ'}</span>
          <div className="chat-message-content">
            <p>{msg.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}