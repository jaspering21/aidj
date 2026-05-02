'use server'

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { safeError, validateStringLength } from '@/lib/errors'
import { checkRateLimit, logRateLimitViolation, getClientIp } from '@/lib/rate-limit'

const exec = null // removed promisify

interface TtsRequest {
  text?: unknown
}

interface TtsResponse {
  audio: string
}

async function generateSpeech(text: string): Promise<string> {
  return new Promise((resolve) => {
    const tmpFile = `/tmp/tts_${Date.now()}.mp3`
    const pyScript = `
import asyncio
import edge_tts

async def main():
    comm = edge_tts.Communicate(${JSON.stringify(text)}, "zh-CN-XiaoxiaoNeural")
    audio = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    with open("${tmpFile}", "wb") as f:
        f.write(audio)

asyncio.run(main())
`
    const child = spawn('python3', ['-c', pyScript])
    let stderr = ''
    child.stderr.on('data', (d) => { stderr += d.toString() })

    const timeout = setTimeout(() => {
      child.kill()
      console.error('[TTS] timeout, stderr:', stderr)
      resolve('')
    }, 12000)

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (code !== 0) {
        console.error('[TTS] python exited with code', code, 'stderr:', stderr)
        resolve('')
        return
      }
      try {
        const audioBuffer = require('fs').readFileSync(tmpFile)
        require('fs').unlinkSync(tmpFile)
        resolve(audioBuffer.toString('base64'))
      } catch (err) {
        console.error('[TTS] file read error:', err)
        resolve('')
      }
    })
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now()
  const ip = getClientIp(request)

  // Rate limit check
  const rateLimit = checkRateLimit(ip, '/api/tts')
  if (!rateLimit.allowed) {
    logRateLimitViolation(ip, '/api/tts')
    const retryAfter = Math.ceil(rateLimit.resetMs / 1000)
    return NextResponse.json(
      { success: false, error: '请求过于频繁，请稍后再试', retryAfter },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    )
  }

  try {
    let body: TtsRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(safeError('Invalid request format', 400), { status: 400 })
    }

    const { text } = body

    // Validate text - must be string, 1-500 chars
    if (!validateStringLength(text, 1, 500)) {
      return NextResponse.json(safeError('No text provided', 400), { status: 400 })
    }

    console.log(`[TTS] action=generate duration_ms=${Date.now() - startTime}`)

    const audioBase64 = await generateSpeech(text as string)
    if (!audioBase64) {
      return NextResponse.json(safeError('TTS failed', 500), { status: 500 })
    }

    return NextResponse.json({ success: true, data: { audio: audioBase64 } as TtsResponse })
  } catch {
    return NextResponse.json(safeError('Service temporarily unavailable', 500), { status: 500 })
  }
}
