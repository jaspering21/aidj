import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIDJ Music Agent',
  description: 'AI-powered music player that adapts to weather, date, and your preferences',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
