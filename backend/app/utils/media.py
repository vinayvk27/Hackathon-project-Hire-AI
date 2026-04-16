import base64
import io
import os

import cv2
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

_PRIYA_VOICE = "nova"
_ARJUN_VOICE = "onyx"


def generate_audio(text: str, voice: str = _PRIYA_VOICE) -> str:
    """Convert text to speech using the specified voice.

    Returns the MP3 audio as a base64-encoded string.
    """
    clean = (
        text.replace("**", "")
            .replace("*", "")
            .replace("#", "")
            .replace("_", "")
    )
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice=voice,
        input=clean,
        response_format="mp3",
        speed=0.95,
    )
    return base64.b64encode(response.content).decode()


def transcribe_audio(audio_bytes: bytes) -> str:
    """Transcribe candidate audio using Whisper.

    The prompt is tuned for Indian-English professional interviews.
    """
    audio_io = io.BytesIO(audio_bytes)
    audio_io.name = "audio.webm"
    result = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_io,
        language="en",
        prompt=(
            "Hello, we are conducting a professional interview in Indian English. "
            "Terms like CTC, lakhs, crores, fresher, notice period, and SMT lines "
            "may be discussed."
        ),
    )
    return result.text


def background_behavior_analysis(
    video_bytes: bytes,
    sid: str,
    turn: int,
    behavior_logs: list[str],
) -> None:
    """Analyse candidate behaviour from a video chunk using GPT-4o vision.

    Samples up to 5 evenly-spaced frames from *video_bytes*, encodes them
    as base64 JPEGs, and sends them to GPT-4o-mini for proctoring analysis.
    The resulting observation string is appended to *behavior_logs* in-place.

    Args:
        video_bytes:    Raw video bytes (any format OpenCV can decode).
        sid:            Session/candidate identifier (used only for logging).
        turn:           Interview turn number (used only for logging).
        behavior_logs:  Mutable list that accumulates observation strings.
    """
    # Decode video frames
    buffer = io.BytesIO(video_bytes)
    buffer.seek(0)

    # Write to a temp file so cv2 can read it (cv2 doesn't accept BytesIO)
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Sample up to 5 evenly-spaced frames
        max_samples = 5
        sample_count = min(max_samples, max(1, total_frames))
        indices = [int(i * total_frames / sample_count) for i in range(sample_count)]

        frame_b64_list = []
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            _, jpeg_buf = cv2.imencode(".jpg", frame)
            frame_b64_list.append(base64.b64encode(jpeg_buf).decode())

        cap.release()
    finally:
        os.unlink(tmp_path)

    if not frame_b64_list:
        behavior_logs.append(f"[turn={turn}] No frames could be extracted.")
        return

    # Build vision prompt
    image_content = [
        {
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"},
        }
        for b64 in frame_b64_list
    ]
    messages = [
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "You are a proctoring assistant for a video job interview. "
                        "Analyse the following frames and report any suspicious behaviour "
                        "such as: looking away from screen, multiple people visible, "
                        "phone usage, reading from notes, or prolonged absence. "
                        "Be concise — one sentence per observation, or 'No issues detected.'"
                    ),
                },
                *image_content,
            ],
        }
    ]

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        max_tokens=200,
    )
    observation = response.choices[0].message.content.strip()
    behavior_logs.append(f"[sid={sid} turn={turn}] {observation}")
