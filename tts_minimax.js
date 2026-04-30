const WebSocket = require('ws')
const fs = require('fs')
const https = require('https')

const API_KEY = process.argv[2]
const TEXT = process.argv[3] || '你好'
const OUTPUT = process.argv[4] || '/tmp/tts_output.mp3'

if (!API_KEY) {
  console.error('Missing API key')
  process.exit(1)
}

let audioData = Buffer.alloc(0)
let isFinished = false
const wsUrl = 'wss://api.minimaxi.com/ws/v1/t2a_v2'

// Create SSL context that bypasses verification
const sslContext = require('tls').createSecureContext({
  checkHostName: false,
  verifyMode: require('tls').REQUIRE_DISABLED
})

const ws = new WebSocket(wsUrl, {
  headers: { Authorization: `Bearer ${API_KEY}` },
  ssl: sslContext
})

ws.on('open', () => {
  console.error('WS: Connected, sending task_start...')
  ws.send(JSON.stringify({
    event: 'task_start',
    model: 'speech-2.8-hd',
    voice_setting: { voice_id: 'male-qn-qingse', speed: 1.2, vol: 1, pitch: 0, english_normalization: false },
    audio_setting: { sample_rate: 32000, bitrate: 128000, format: 'mp3', channel: 1 }
  }))
})

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString())
    console.error('WS: Received event:', msg.event, 'is_final:', msg.is_final)

    if (msg.event === 'connected_success') {
      return
    }

    if (msg.event === 'task_started') {
      console.error('WS: Task started, sending text...')
      ws.send(JSON.stringify({ event: 'task_continue', text: TEXT }))
    } else if (msg.data?.audio) {
      audioData = Buffer.concat([audioData, Buffer.from(msg.data.audio, 'hex')])
      console.error('WS: Received audio chunk, total length:', audioData.length)
    }
    if (msg.event === 'task_continued' || msg.event === 'task_finished') {
      if (msg.is_final === true || msg.event === 'task_finished') {
        isFinished = true
        console.error('WS: Final message received, writing', audioData.length, 'bytes')
        if (audioData.length > 0) {
          fs.writeFileSync(OUTPUT, audioData)
        }
        ws.send(JSON.stringify({ event: 'task_finish' }))
        ws.close()
        process.exit(0)
      }
    }
  } catch (e) {
    console.error('Parse error:', e.message)
  }
})

ws.on('error', (err) => {
  console.error('WS error:', err.message)
  process.exit(1)
})

ws.on('close', () => {
  console.error('WS: Closed, audio length:', audioData.length)
  if (audioData.length > 0) {
    fs.writeFileSync(OUTPUT, audioData)
  }
  process.exit(0)
})

setTimeout(() => {
  console.error('Timeout, closing...')
  ws.close()
  if (audioData.length > 0) {
    fs.writeFileSync(OUTPUT, audioData)
  }
  process.exit(0)
}, 20000)