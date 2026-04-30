'use server'

import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { readFile } from 'fs/promises'

const exec = promisify(spawn)

async function generateSpeech(text: string): Promise<string> {
  try {
    const pyScript = `
import asyncio
import edge_tts
async def main():
    comm = edge_tts.Communicator(${JSON.stringify(text)}, "zh-CN-XiaoxiaoNeural")
    audio = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio += chunk["data"]
    import sys
    sys.stdout.buffer.write(audio)
asyncio.run(main())
`
    const result = await exec('python3', ['-c', pyScript], {
      timeout: 15000
    }) as { stdout: Buffer }
    const audioBuffer = result.stdout
    return audioBuffer.toString('base64')
  } catch (err) {
    console.error('TTS error:', err)
    return ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    if (!text) return NextResponse.json({ success: false, error: 'No text provided' }, { status: 400 })

    const audioBase64 = await generateSpeech(text)
    if (!audioBase64) return NextResponse.json({ success: false, error: 'TTS failed' }, { status: 500 })

    return NextResponse.json({ success: true, data: { audio: audioBase64 } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}