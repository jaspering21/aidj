#!/usr/bin/env python3
import asyncio
import edge_tts
import sys
import json

def main():
    if len(sys.argv) < 3:
        print("Usage: tts.py <text> <voice>")
        sys.exit(1)

    text = sys.argv[1]
    voice = sys.argv[2]

    try:
        comm = edge_tts.Communicate(text, voice)
        audio = b""
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                audio += chunk["data"]
        sys.stdout.buffer.write(audio)
    except Exception as e:
        print(f"TTS error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()