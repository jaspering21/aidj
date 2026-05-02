'use client'

interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export default function ChatInput({ value, onChange, onSubmit }: ChatInputProps) {
  return (
    <form onSubmit={onSubmit}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="输入消息..."
        className="chat-input"
      />
    </form>
  )
}