import { useState, useRef } from 'react'
import { Mic, Square, Loader } from 'lucide-react'
import api from '../api/client'

export default function AudioRecorder({ onTranscription }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size < 1000) return

        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append('file', blob, 'audio.webm')
          const res = await api.post('/audio/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          onTranscription(res.data.text || '')
        } catch {
          onTranscription('')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setIsRecording(true)
    } catch {
      alert('Microphone access denied. Please allow microphone permissions.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  if (isTranscribing) {
    return (
      <button disabled className="p-2 rounded-lg bg-slate-100 text-slate-400" title="Transcribing...">
        <Loader size={18} className="animate-spin" />
      </button>
    )
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      title={isRecording ? 'Stop recording' : 'Record answer'}
      className={`p-2 rounded-lg transition-colors ${
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
      }`}
    >
      {isRecording ? <Square size={18} /> : <Mic size={18} />}
    </button>
  )
}
