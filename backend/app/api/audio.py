import io
import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter()


class TTSRequest(BaseModel):
    text: str


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Receives an audio file, sends it to OpenAI Whisper,
    and returns the transcribed text.
    """
    try:
        audio_bytes = await file.read()
        audio_buffer = io.BytesIO(audio_bytes)
        audio_buffer.name = file.filename or "audio.wav"

        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_buffer,
        )
        return {"text": transcript.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speak")
def text_to_speech(request: TTSRequest):
    """
    Converts text to speech using OpenAI TTS and returns audio bytes (mp3).
    Used to read questions aloud to the hiring manager.
    """
    try:
        response = client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=request.text,
        )
        return Response(content=response.content, media_type="audio/mpeg")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
