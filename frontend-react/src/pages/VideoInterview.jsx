import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic, MicOff, CheckCircle, AlertCircle, Loader2,
  Volume2, ArrowLeft, Clock, Leaf,
} from 'lucide-react'
import api from '../api/client'

// ---------------------------------------------------------------------------
// Persona config (from Code 1 - Light Theme & Avatars)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Persona config
// ---------------------------------------------------------------------------
const PERSONAS = {
  Priya: {
    name: 'Priya Sharma',
    role: 'HR Recruiter',
    location: 'Chennai, India',
    avatarGradient: 'from-rose-500 via-pink-500 to-fuchsia-600',
    avatarBg: 'bg-rose-100',
    badgeBg: 'bg-rose-50 border-rose-200 text-rose-600',
    // Note: Absolute local paths will likely be blocked by your browser. 
    // Consider moving this image to your React 'public' folder.
    avatar: '/Priya.png',
    initial: 'P',
    greeting:
      'Hi! I\'m Priya from HR. Press "Talk" below and say hello whenever you\'re ready.',
  },
  Arjun: {
    name: 'Arjun Mehta',
    role: 'Senior Engineer',
    location: 'Bangalore, India',
    avatarGradient: 'from-blue-500 via-indigo-500 to-violet-600',
    avatarBg: 'bg-blue-100',
    badgeBg: 'bg-blue-50 border-blue-200 text-blue-600',
    avatar: '/Arjun.png',
    initial: 'A',
    greeting:
      'The HR round is complete. Press "Talk" to begin your technical interview.',
  },
  Rajesh: {
    name: 'Rajesh Iyer',
    role: 'Head of HR',
    location: 'Mumbai, India',
    avatarGradient: 'from-sky-500 via-sky-600 to-green-600',
    avatarBg: 'bg-sky-100',
    badgeBg: 'bg-sky-50 border-sky-200 text-sky-600',
    avatar: '/Rajesh.png',
    initial: 'R',
    greeting:
      'Hi, I\'m Rajesh — Head of HR. We\'d like a final conversation before we wrap up. Press "Talk" when you\'re ready.',
  },
}

// Maps candidate status → persona key (Kept Code 2's structure)
const STATUS_TO_PERSONA = {
  Shortlisted: 'Priya',
  Assessed: 'Arjun',
  Tech_Done: 'Rajesh',
  // legacy status names kept for backwards compatibility
  Pending_Screening: 'Priya',
  Screening_Done: 'Arjun',
}

const ROUND_LABELS = {
  Shortlisted: 'HR Screening Round',
  Assessed: 'Technical Round',
  Tech_Done: 'Final HR Round',
  Pending_Screening: 'HR Screening Round',
  Screening_Done: 'Technical Round',
  Interview_Complete: 'Interview Complete',
}

// ---------------------------------------------------------------------------
// Small reusable pieces (Light Theme)
// ---------------------------------------------------------------------------

function StatusDot({ phase }) {
  const base = 'w-2 h-2 rounded-full inline-block mr-2'
  if (phase === 'speaking')   return <span className={`${base} bg-emerald-500 animate-pulse`} />
  if (phase === 'processing') return <span className={`${base} bg-amber-400 animate-pulse`} />
  if (phase === 'recording')  return <span className={`${base} bg-red-400 animate-pulse`} />
  return <span className={`${base} bg-sky-300`} />
}

function PhaseLabel({ phase, persona }) {
  const map = {
    ready: 'Ready to begin',
    starting: 'Connecting…',
    idle: 'Listening…',
    recording: 'Recording your answer…',
    processing: `${persona} is thinking…`,
    speaking: `${persona} is speaking…`,
    complete: 'Interview complete',
    error: 'Connection error — try again',
  }
  return <span>{map[phase] ?? 'Initialising…'}</span>
}

function TypingIndicator({ personaFirstName }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider">
        {personaFirstName}
      </p>
      <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 px-4 py-3 rounded-2xl rounded-tl-sm w-fit">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-sky-400"
            style={{ animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  )
}

function SpeakingWave({ active }) {
  if (!active) return null
  return (
    <div className="flex items-end gap-[3px] h-6">
      {[4, 7, 5, 9, 6, 8, 4, 7, 5].map((h, i) => (
        <div
          key={i}
          className="w-[3px] bg-current rounded-full origin-bottom"
          style={{
            height: `${h * 2.5}px`,
            animation: `speakBar 0.6s ease-in-out ${i * 0.07}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// PersonaCard — Light themed
// ---------------------------------------------------------------------------
function PersonaCard({ phase, personaConfig, lastReply }) {
  const isSpeaking   = phase === 'speaking'
  const isProcessing = phase === 'processing'
  const isListening  = phase === 'idle'
  const isRecording  = phase === 'recording'

  const avatarStyle = {
    transition: 'box-shadow 0.4s ease-in-out',
    animation: isSpeaking
      ? 'speakingGlow 1.6s ease-in-out infinite'
      : isListening
      ? 'listeningGlow 2.4s ease-in-out infinite'
      : isRecording
      ? 'recordingGlow 1s ease-in-out infinite'
      : 'none',
  }

  const outerRingStyle = {
    transition: 'background 0.4s ease-in-out, opacity 0.4s ease-in-out',
    animation: isSpeaking
      ? 'outerRingSpeaking 1.4s ease-in-out infinite'
      : isListening
      ? 'outerRingListening 2.6s ease-in-out infinite'
      : isRecording
      ? 'outerRingRecording 1.1s ease-in-out infinite'
      : 'none',
    background: isSpeaking
      ? 'rgba(99,102,241,0.08)'
      : isListening
      ? 'rgba(16,185,129,0.07)'
      : isRecording
      ? 'rgba(239,68,68,0.08)'
      : 'transparent',
  }

  const midRingStyle = {
    transition: 'box-shadow 0.4s ease-in-out, opacity 0.4s ease-in-out',
    boxShadow: isSpeaking
      ? '0 0 0 2px rgba(99,102,241,0.4)'
      : isListening
      ? '0 0 0 2px rgba(16,185,129,0.35)'
      : isRecording
      ? '0 0 0 2px rgba(239,68,68,0.4)'
      : '0 0 0 1px rgba(14,165,233,0.15)',
    opacity: (isSpeaking || isListening || isRecording) ? 1 : 0.4,
    animation: isSpeaking
      ? 'midRingSpeaking 1.2s ease-in-out infinite'
      : isListening
      ? 'midRingListening 2.2s ease-in-out infinite'
      : 'none',
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full select-none overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-sky-200/80 shadow-lg shadow-sky-900/10">
      {/* Subtle gradient wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${personaConfig.avatarGradient} opacity-[0.04] pointer-events-none`} />

      {/* Outer breathing ring */}
      <div className="absolute w-56 h-56 rounded-3xl pointer-events-none" style={outerRingStyle} />

      {/* Mid ring */}
      <div className="absolute w-44 h-44 rounded-3xl pointer-events-none" style={midRingStyle} />

      {/* Avatar — fills the entire left panel */}
      <div
        className={`absolute inset-0 z-0 rounded-2xl overflow-hidden ${personaConfig.avatarBg}`}
        style={avatarStyle}
      >
        <img
          src={personaConfig.avatar}
          alt={personaConfig.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.nextSibling.style.display = 'flex'
          }}
        />
        <div className={`hidden absolute inset-0 bg-gradient-to-br ${personaConfig.avatarGradient} items-center justify-center`}>
          <span className="text-4xl font-bold text-white">{personaConfig.initial}</span>
        </div>
      </div>

      {/* Name + role */}
      <div className="relative z-10 mt-5 text-center space-y-1">
        <p className="text-xl font-bold text-sky-950 tracking-tight">{personaConfig.name}</p>
        <p className="text-sm text-sky-500">{personaConfig.role} · {personaConfig.location}</p>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border mt-2 ${personaConfig.badgeBg}`}>
          <StatusDot phase={phase} />
          <PhaseLabel phase={phase} persona={personaConfig.name.split(' ')[0]} />
        </span>
      </div>

      {/* Speaking wave */}
      <div
        className="relative z-10 mt-4 text-sky-500"
        style={{ opacity: isSpeaking ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}
      >
        <SpeakingWave active={isSpeaking} />
      </div>

      {/* Processing spinner */}
      {isProcessing && (
        <div className="relative z-10 mt-4">
          <Loader2 className="text-amber-500 animate-spin" size={22} />
        </div>
      )}

      {/* Last reply bubble */}
      {lastReply && (
        <div className="relative z-10 mx-6 mt-6 px-4 py-3 bg-sky-50 border border-sky-200 rounded-xl max-w-xs shadow-sm">
          <p className="text-sm text-sky-800 leading-relaxed line-clamp-4 italic">
            "{lastReply}"
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// CandidateView — Light themed
// ---------------------------------------------------------------------------
function CandidateView({ videoRef, candidateName, cameraError, isActive }) {
  return (
    <div className="relative aspect-video flex items-center justify-center bg-sky-50 rounded-2xl border border-sky-200 shadow-md shadow-sky-900/10">
      {cameraError ? (
        <div className="flex flex-col items-center gap-2 text-sky-400">
          <MicOff size={28} />
          <span className="text-xs font-medium">Camera unavailable</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover scale-x-[-1] rounded-2xl"
        />
      )}

      {/* Proctoring badge */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-red-200 px-2.5 py-1 rounded-full shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-bold text-red-500 tracking-wide uppercase">Proctoring Active</span>
        </div>
      )}

      {/* Name badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm border border-sky-200 px-3 py-1 rounded-full shadow-sm">
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-sky-900 text-xs font-semibold">{candidateName}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// TalkButton — Light themed
// ---------------------------------------------------------------------------
function TalkButton({ phase, onToggle }) {
  const disabled    = phase === 'processing' || phase === 'speaking' || phase === 'starting' || phase === 'complete'
  const isRecording = phase === 'recording'

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50
          ${disabled    ? 'bg-sky-100 cursor-not-allowed opacity-50' : ''}
          ${isRecording ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-400/40' : ''}
          ${!disabled && !isRecording ? 'bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 shadow-lg shadow-sky-500/35 transform hover:-translate-y-0.5' : ''}
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400/30 animate-ping" />
        )}
        {isRecording ? (
          <div className="w-4 h-4 rounded-sm bg-white" />
        ) : (
          <Mic size={24} className="text-white" />
        )}
      </button>
      <span className="text-xs text-sky-500 font-medium">
        {isRecording ? 'Click to stop' : disabled ? '—' : 'Click to Talk'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ThankYouScreen — Light themed
// ---------------------------------------------------------------------------
function ThankYouScreen({ candidateName, onReturn }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 flex items-center justify-center p-8 font-sans">
      <div className="fixed top-0 left-[20%] w-[500px] h-[300px] bg-sky-300/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-[10%] w-[400px] h-[400px] bg-green-300/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <CheckCircle size={40} className="text-white" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-sky-950 tracking-tight">Interview Complete!</h1>
          <p className="text-sky-700 text-lg">
            Thank you, <span className="text-sky-950 font-bold">{candidateName}</span>.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-sm border border-sky-200 rounded-2xl shadow-lg shadow-sky-900/10 p-6 text-left space-y-3">
          <p className="text-sm font-bold text-sky-800 uppercase tracking-wider">What's next?</p>
          <ul className="space-y-2">
            {[
              'Our team will review your responses within 24–48 hours.',
              "You'll receive an email update on next steps.",
              'The technical evaluation is now complete.',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-sky-700">
                <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={onReturn}
          className="px-8 py-3 text-base font-bold text-white bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 rounded-xl shadow-lg shadow-sky-500/30 transition-all transform hover:-translate-y-0.5"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main VideoInterview page (Logic from Code 2, Views from Code 1)
// ---------------------------------------------------------------------------
export default function VideoInterview() {
  const navigate = useNavigate()
  const candidateId = Number(localStorage.getItem('candidate_id'))
  const candidateName = localStorage.getItem('candidate_name') || 'Candidate'

  // DOM refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const chatEndRef = useRef(null)

  // Media refs
  const videoStreamRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const currentAudioRef = useRef(null)
  const proctoringTimerRef = useRef(null)

  // Component state
  const [phase, setPhase] = useState('init')   // init | ready | starting | idle | recording | processing | speaking | complete | error
  const [turn, setTurn] = useState(0)
  const [interviewStatus, setInterviewStatus] = useState(
    () => localStorage.getItem('candidate_status') || 'Shortlisted'
  )
  const [lastTranscript, setLastTranscript] = useState('')
  const [lastReply, setLastReply] = useState('')
  const [error, setError] = useState('')
  const [cameraError, setCameraError] = useState(false)
  const [elapsedSecs, setElapsedSecs] = useState(0)

  // Derived
  const persona = STATUS_TO_PERSONA[interviewStatus] ?? 'Priya'
  const personaConfig = PERSONAS[persona]
  const roundLabel = ROUND_LABELS[interviewStatus] ?? 'Interview'

  // Redirect if not logged in
  useEffect(() => {
    if (!candidateId) navigate('/candidate-login')
  }, [candidateId, navigate])

  // ---- Camera setup --------------------------------------------------------
  useEffect(() => {
    let stream
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        videoStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraError(true)
      } finally {
        setPhase('ready')
      }
    })()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      videoStreamRef.current = null
    }
  }, [])

  // ---- Elapsed timer -------------------------------------------------------
  useEffect(() => {
    if (phase === 'idle' || phase === 'recording' || phase === 'processing' || phase === 'speaking') {
      const id = setInterval(() => setElapsedSecs((s) => s + 1), 1000)
      return () => clearInterval(id)
    }
  }, [phase === 'idle' || phase === 'recording'])

  // ---- Proctoring (snapshot every 30s) ------------------------------------
  useEffect(() => {
    const activePhases = new Set(['idle', 'recording', 'processing', 'speaking'])
    if (!activePhases.has(phase)) return

    proctoringTimerRef.current = setInterval(() => {
      captureAndSendSnapshot()
    }, 30_000)

    return () => clearInterval(proctoringTimerRef.current)
  }, [phase, turn, candidateId])

  // ---- Helpers -------------------------------------------------------------
  const captureAndSendSnapshot = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || cameraError) return

    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        const form = new FormData()
        form.append('file', blob, 'frame.jpg')
        api
          .post(`/interview/analyze?sid=${candidateId}&turn=${turn}`, form)
          .catch((error) => console.error('🔍 FastAPI 422 Error:', error.response?.data?.detail || error.message))
      },
      'image/jpeg',
      0.7,
    )
  }, [candidateId, turn, cameraError])

  const playAudio = useCallback((base64, onEnd) => {
    setPhase('speaking')
    const audio = new Audio(`data:audio/mp3;base64,${base64}`)
    currentAudioRef.current = audio
    audio.onended = () => {
      currentAudioRef.current = null
      onEnd()
    }
    audio.onerror = () => {
      currentAudioRef.current = null
      onEnd()
    }
    audio.play().catch(() => onEnd())
  }, [])

  const handleApiResponse = useCallback(
    (data) => {
      const { transcript, reply_text, audio_base64, is_complete, interview_status } = data
      setLastTranscript(transcript || '')
      setLastReply(reply_text)
      setInterviewStatus(interview_status)
      setTurn((t) => t + 1)

      playAudio(audio_base64, () => {
        if (is_complete) {
          const nextStatus = {
            Shortlisted: 'Screening_Done',
            Assessed: 'Tech_Done',
            Tech_Done: 'Interview_Complete',
          }[interview_status]
          if (nextStatus) localStorage.setItem('candidate_status', nextStatus)
          setPhase('complete')
        } else {
          setPhase('idle')
        }
      })
    },
    [playAudio],
  )

  // ---- First turn (text trigger, no audio) ---------------------------------
  const startInterview = async () => {
    setPhase('starting')
    setError('')
    try {
      const form = new FormData()
      form.append('candidate_id', String(candidateId))
      form.append('turn', '0')
      form.append('text_input', 'Hello, I am ready for the interview.')
      const res = await api.post('/interview/chat', form)
      handleApiResponse(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect. Please try again.')
      setPhase('ready')
    }
  }

  // ---- Audio recording -----------------------------------------------------
  const startRecording = useCallback(async () => {
    if (phase !== 'idle') return
    setError('')
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        sendAudioTurn(blob)
      }
      recorder.start()
      setPhase('recording')
    } catch {
      setError('Microphone access denied. Please allow microphone permissions.')
    }
  }, [phase])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setPhase('processing')
    }
  }, [])

  const toggleTalk = useCallback(() => {
    if (phase === 'idle') startRecording()
    else if (phase === 'recording') stopRecording()
  }, [phase, startRecording, stopRecording])

  // ---- Send audio turn to API ----------------------------------------------
  const sendAudioTurn = useCallback(
    async (audioBlob) => {
      setPhase('processing')
      const form = new FormData()
      form.append('candidate_id', String(candidateId))
      form.append('turn', String(turn))
      form.append('audio_file', audioBlob, 'audio.webm')

      // Attach a snapshot for proctoring
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && !cameraError) {
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 240
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        await new Promise((resolve) => {
          canvas.toBlob(
            (blob) => {
              if (blob) form.append('video_file', blob, 'frame.jpg')
              resolve()
            },
            'image/jpeg',
            0.7,
          )
        })
      }

      try {
        const res = await api.post('/interview/chat', form)
        handleApiResponse(res.data)
      } catch (err) {
        const msg = err.response?.data?.detail || 'Something went wrong. Please try again.'
        setError(msg)
        setPhase('idle')
      }
    },
    [candidateId, turn, cameraError, handleApiResponse],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      currentAudioRef.current?.pause()
      clearInterval(proctoringTimerRef.current)
      videoStreamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ---- Auto-scroll chat to bottom on new messages -------------------------
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lastTranscript, lastReply, phase])

  // ---- Format elapsed time -------------------------------------------------
  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // =========================================================================
  // Render: complete
  // =========================================================================
  if (phase === 'complete') {
    return (
      <ThankYouScreen
        candidateName={candidateName}
        onReturn={() => navigate('/dashboard')}
      />
    )
  }

  // =========================================================================
  // Render: main interview UI (Light Theme Views)
  // =========================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 flex flex-col font-sans select-none overflow-hidden">
      {/* Ambient glows */}
      <div className="fixed top-0 left-[20%] w-[600px] h-[300px] bg-sky-300/15 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[10%] w-[400px] h-[400px] bg-green-300/10 rounded-full blur-[120px] pointer-events-none z-0" />

      <canvas ref={canvasRef} className="hidden" />

      {/* Top bar */}
      <header className="relative z-10 shrink-0 flex items-center justify-between px-6 py-3 bg-white/80 border-b border-sky-200 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-sky-600 to-green-600 p-1.5 rounded-lg shadow-md shadow-sky-500/30 ring-1 ring-sky-400/30">
            <Leaf size={16} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <p className="text-sm font-bold text-sky-950 leading-tight">Hire AI Interview</p>
            <p className="text-xs text-sky-500 leading-tight">{roundLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {(phase !== 'init' && phase !== 'ready') && (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-500">LIVE</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sky-500 text-sm font-medium">
            <Clock size={13} />
            <span className="tabular-nums">{formatTime(elapsedSecs)}</span>
          </div>

          {turn > 0 && (
            <span className="text-xs text-sky-400 font-semibold bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
              Turn {turn}
            </span>
          )}
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 p-4 min-h-0">
        {/* Persona card */}
        <div className="lg:col-span-3 min-h-[320px]">
          <PersonaCard
            phase={phase}
            personaConfig={personaConfig}
            lastReply={lastReply}
          />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {/* Webcam */}
          <div className="shrink-0">
            <CandidateView
              videoRef={videoRef}
              candidateName={candidateName}
              cameraError={cameraError}
              isActive={phase !== 'init' && phase !== 'ready' && phase !== 'complete'}
            />
          </div>

          {/* Transcript log */}
          <div className="flex-1 bg-white/90 backdrop-blur-sm border border-sky-200/80 rounded-2xl shadow-lg shadow-sky-900/10 p-4 overflow-y-auto min-h-0 flex flex-col">
            <p className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-3 shrink-0">
              Transcript
            </p>
            <div className="flex-1 flex flex-col justify-end">
              {phase === 'init' || phase === 'ready' ? (
                <p className="text-sm text-sky-400 italic">
                  {phase === 'init' ? 'Setting up camera…' : personaConfig.greeting}
                </p>
              ) : lastTranscript || lastReply ? (
                <div className="space-y-3">
                  {lastTranscript && (
                    <div className="space-y-1 flex flex-col items-end">
                      <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">You</p>
                      <p className="text-sm text-sky-900 bg-sky-100 border border-sky-200 px-3 py-2 rounded-2xl rounded-br-sm max-w-[90%]">
                        {lastTranscript}
                      </p>
                    </div>
                  )}
                  {lastReply && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">
                        {personaConfig.name.split(' ')[0]}
                      </p>
                      <p className="text-sm text-sky-800 bg-sky-50 border border-sky-200 px-3 py-2 rounded-2xl rounded-tl-sm max-w-[90%]">
                        {lastReply}
                      </p>
                    </div>
                  )}
                  {phase === 'processing' && (
                    <TypingIndicator personaFirstName={personaConfig.name.split(' ')[0]} />
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-sky-400 italic">Interview in progress…</p>
                  {phase === 'processing' && (
                    <div className="mt-3">
                      <TypingIndicator personaFirstName={personaConfig.name.split(' ')[0]} />
                    </div>
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </main>

      {/* Control bar */}
      <footer className="relative z-10 shrink-0 bg-white/80 border-t border-sky-200 backdrop-blur-sm px-6 py-5 shadow-[0_-4px_16px_rgba(14,165,233,0.06)]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl w-full font-medium">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-8">
            {/* Leave */}
            <button
              onClick={() => navigate('/candidate-login')}
              className="flex flex-col items-center gap-1 text-sky-500 hover:text-sky-700 transition-colors"
              title="Leave interview"
            >
              <div className="w-10 h-10 rounded-full bg-sky-100 hover:bg-sky-200 flex items-center justify-center transition-colors">
                <ArrowLeft size={18} />
              </div>
              <span className="text-[10px] font-medium">Leave</span>
            </button>

            {/* Start / Talk */}
            {phase === 'ready' || phase === 'init' ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={startInterview}
                  disabled={phase === 'init' || phase === 'starting'}
                  className="relative w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-emerald-400/30 transition-all transform hover:-translate-y-0.5"
                >
                  {phase === 'starting' ? (
                    <Loader2 size={24} className="animate-spin text-white" />
                  ) : (
                    <Mic size={24} className="text-white" />
                  )}
                </button>
                <span className="text-xs text-sky-500 font-medium">Start Interview</span>
              </div>
            ) : (
              <TalkButton phase={phase} onToggle={toggleTalk} />
            )}

            {/* Volume */}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                phase === 'speaking'
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-sky-100 text-sky-400'
              }`}>
                <Volume2 size={18} />
              </div>
              <span className="text-[10px] text-sky-400 font-medium">Audio</span>
            </div>
          </div>

          <p className="text-xs text-sky-400 font-medium">
            {phase === 'idle'       && 'Press Talk when you\'re ready to respond. Click again to send.'}
            {phase === 'recording'  && 'Speaking… click the button again to finish your answer.'}
            {phase === 'processing' && `${personaConfig.name.split(' ')[0]} is preparing a response…`}
            {phase === 'speaking'   && 'Please listen. You can respond once the audio finishes.'}
            {phase === 'ready'      && 'Camera ready. Click "Start Interview" to begin.'}
            {(phase === 'init' || phase === 'starting') && 'Setting up your interview session…'}
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes speakBar {
          from { transform: scaleY(0.3); opacity: 0.5; }
          to   { transform: scaleY(1);   opacity: 1;   }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0);    opacity: 0.4; }
          30%            { transform: translateY(-5px); opacity: 1;   }
        }
        @keyframes listeningGlow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(16,185,129,0.10), 0 0 0 0 rgba(16,185,129,0); }
          50%       { box-shadow: 0 0 22px 8px rgba(16,185,129,0.25), 0 0 0 14px rgba(16,185,129,0.06); }
        }
        @keyframes recordingGlow {
          0%, 100% { box-shadow: 0 0 8px 2px rgba(239,68,68,0.15), 0 0 0 0 rgba(239,68,68,0); }
          50%       { box-shadow: 0 0 22px 8px rgba(239,68,68,0.30), 0 0 0 12px rgba(239,68,68,0.07); }
        }
        @keyframes speakingGlow {
          0%, 100% { box-shadow: 0 0 10px 4px rgba(99,102,241,0.12), 0 0 0 0 rgba(99,102,241,0); }
          50%       { box-shadow: 0 0 28px 10px rgba(99,102,241,0.28), 0 0 0 18px rgba(99,102,241,0.06); }
        }
        @keyframes outerRingListening {
          0%, 100% { transform: scale(0.92); opacity: 0;   }
          50%       { transform: scale(1.06); opacity: 0.6; }
        }
        @keyframes outerRingRecording {
          0%, 100% { transform: scale(0.95); opacity: 0;   }
          50%       { transform: scale(1.08); opacity: 0.7; }
        }
        @keyframes outerRingSpeaking {
          0%, 100% { transform: scale(0.90); opacity: 0;   }
          50%       { transform: scale(1.10); opacity: 0.5; }
        }
        @keyframes midRingListening {
          0%, 100% { transform: scale(1);    }
          50%       { transform: scale(1.05); }
        }
        @keyframes midRingSpeaking {
          0%, 100% { transform: scale(1);    }
          25%       { transform: scale(1.04); }
          75%       { transform: scale(1.08); }
        }
      `}</style>
    </div>
  )
}