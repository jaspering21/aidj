'use client'

import { useState, useEffect, useRef } from 'react'

interface LoginModalProps {
  onSuccess: (nickname: string, cookie: string) => void
  onClose?: () => void
}

export default function NeteaseLoginModal({ onSuccess, onClose }: LoginModalProps) {
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [qrKey, setQrKey] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'waiting' | 'scanned' | 'expired' | 'confirmed' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [confirmedNickname, setConfirmedNickname] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startQrLogin()
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [])

  const startQrLogin = async () => {
    setStatus('loading')
    setError(null)
    setQrImage(null)
    setQrKey(null)

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    try {
      const keyRes = await fetch('/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qrKey' })
      })
      const keyData = await keyRes.json()

      if (!keyData.success || !keyData.data?.unikey) {
        throw new Error(keyData.error || '无法获取二维码 Key')
      }

      const key = keyData.data.unikey
      setQrKey(key)

      const loginUrl = `https://music.163.com/login?codekey=${key}`
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(loginUrl)}&size=200x200&margin=8&color=22-55-55&bgcolor=5-5-10`
      setQrImage(qrImageUrl)
      setStatus('waiting')

      pollIntervalRef.current = setInterval(checkQrStatus, 2000)
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const checkQrStatus = async () => {
    if (!qrKey || status === 'expired' || status === 'error') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      return
    }

    try {
      const res = await fetch('/api/netease-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'qrCheck', key: qrKey })
      })
      const data = await res.json()

      if (!data.success) {
        console.error('qrCheck error:', data.error)
        return
      }

      const code = data.data.code

      if (code === 800) {
        setStatus('expired')
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      } else if (code === 802) {
        setStatus('scanned')
      } else if (code === 803) {
        setStatus('confirmed')
        setConfirmedNickname(data.data.nickname || '用户')
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)

        const cookie = data.data.cookie || ''
        if (cookie) {
          // Save session to server first, then update UI
          try {
            const loginRes = await fetch('/api/netease-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'login', cookie })
            })
            const loginData = await loginRes.json()
            if (loginData.success) {
              setTimeout(() => {
                onSuccess(data.data.nickname || '用户', cookie)
                if (onClose) onClose()
              }, 1500)
            } else {
              setError('登录失败: ' + (loginData.error || '未知错误'))
              setStatus('error')
            }
          } catch (e) {
            console.error('Failed to save session:', e)
            setError('保存会话失败，请重试')
            setStatus('error')
          }
        } else {
          setError('登录成功但未获取到 Cookie，请重试')
          setStatus('error')
        }
      }
    } catch (e) {
      console.error('qrCheck fetch error:', e)
    }
  }

  const handleClose = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    if (onClose) onClose()
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0, 0, 0, 0.85)' }}>
      <div className="glass-panel p-8 max-w-sm w-full relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="status-dot on-air" />
            <span className="hud-label">AIDJ</span>
          </div>
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
            网易云音乐扫码登录
          </h2>
        </div>

        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.2), transparent)' }} className="mb-6" />

        <div className="flex flex-col items-center">
          {status === 'loading' && (
            <div className="qr-container flex items-center justify-center h-52">
              <div className="status-dot on-air" />
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: '#ef4444' }}>{error}</p>
              <button onClick={startQrLogin} className="console-btn px-6 py-3 rounded-lg">
                重试
              </button>
            </div>
          )}

          {status === 'waiting' && qrImage && (
            <div className="text-center">
              <div className="qr-container mb-4">
                <img src={qrImage} alt="QR Code" className="w-48 h-48" />
              </div>
              <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                打开网易云音乐App扫码
              </p>
            </div>
          )}

          {status === 'scanned' && qrImage && (
            <div className="text-center">
              <div className="qr-container mb-4">
                <img src={qrImage} alt="QR Code" className="w-48 h-48 opacity-80" />
              </div>
              <p className="text-sm text-glow-green" style={{ color: 'var(--accent-neon-green)' }}>
                ✓ 已扫码，请在手机确认登录
              </p>
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center">
              <div className="qr-container mb-4 h-52 flex items-center justify-center">
                <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  二维码已过期
                </span>
              </div>
              <button onClick={startQrLogin} className="console-btn px-6 py-3 rounded-lg">
                重新生成
              </button>
            </div>
          )}

          {status === 'confirmed' && (
            <div className="text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '1px solid rgba(0, 255, 136, 0.3)',
                  boxShadow: '0 0 30px rgba(0, 255, 136, 0.2)'
                }}
              >
                <span className="text-3xl text-glow-green" style={{ color: 'var(--accent-neon-green)' }}>✓</span>
              </div>
              <p className="text-sm text-glow-green mb-1" style={{ color: 'var(--accent-neon-green)' }}>
                登录成功
              </p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {confirmedNickname || '用户'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}