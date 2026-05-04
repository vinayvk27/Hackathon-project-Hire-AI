import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, FileText, Video, Users, Lock, ChevronRight, CheckCircle2, LogOut, Leaf } from 'lucide-react'

const STAGES = [
  {
    id: 1,
    label: 'Screening Call',
    description: 'Initial AI screening call to assess your background and fit for the role.',
    icon: Phone,
    activeStatus: 'Shortlisted',
    route: '/interview',
    color: 'emerald',
  },
  {
    id: 2,
    label: 'Technical Assessment',
    description: 'Complete a timed MCQ & written test to evaluate your core technical skills.',
    icon: FileText,
    activeStatus: 'Screening_Done',
    route: '/assessment',
    color: 'sky',
  },
  {
    id: 3,
    label: 'Technical Round',
    description: 'In-depth AI interview covering problem-solving and technical depth.',
    icon: Video,
    activeStatus: 'Assessed',
    route: '/interview',
    color: 'violet',
  },
  {
    id: 4,
    label: 'Final HR & Offer',
    description: 'Culture-fit and offer discussion conducted by our AI HR agent.',
    icon: Users,
    activeStatus: 'Tech_Done',
    route: '/interview',
    color: 'orange',
  },
]

const STATUS_ORDER = ['Shortlisted', 'Screening_Done', 'Assessed', 'Tech_Done', 'Hired', 'Rejected']

function stageState(stage, currentStatus) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const activeIdx  = STATUS_ORDER.indexOf(stage.activeStatus)

  if (currentIdx < activeIdx)  return 'locked'
  if (currentIdx === activeIdx) return 'active'
  return 'done'
}

const colorMap = {
  emerald: {
    bg:          'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400',
    icon:        'bg-emerald-100 text-emerald-600',
    badge:       'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    actionBadge: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
    glowShadow:  '0 0 0 2px rgba(16,185,129,0.25), 0 8px 32px rgba(16,185,129,0.12), 0 4px 24px rgba(14,165,233,0.08)',
  },
  sky: {
    bg:          'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-400 hover:to-blue-400',
    icon:        'bg-sky-100 text-sky-600',
    badge:       'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    actionBadge: 'bg-sky-100 text-sky-700 border border-sky-300',
    glowShadow:  '0 0 0 2px rgba(14,165,233,0.25), 0 8px 32px rgba(14,165,233,0.12), 0 4px 24px rgba(14,165,233,0.08)',
  },
  violet: {
    bg:          'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-400 hover:to-purple-400',
    icon:        'bg-violet-100 text-violet-600',
    badge:       'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    actionBadge: 'bg-violet-100 text-violet-700 border border-violet-300',
    glowShadow:  '0 0 0 2px rgba(139,92,246,0.25), 0 8px 32px rgba(139,92,246,0.12), 0 4px 24px rgba(139,92,246,0.08)',
  },
  orange: {
    bg:          'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400',
    icon:        'bg-orange-100 text-orange-600',
    badge:       'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    actionBadge: 'bg-orange-100 text-orange-700 border border-orange-300',
    glowShadow:  '0 0 0 2px rgba(249,115,22,0.25), 0 8px 32px rgba(249,115,22,0.12), 0 4px 24px rgba(249,115,22,0.08)',
  },
}

// Derive a single dashboard status from the two backend fields.
// STATUS_ORDER: Shortlisted → Screening_Done → Assessed → Tech_Done → Hired/Rejected
function deriveStatus(candidateStatus, interviewStatus) {
  if (interviewStatus === 'Interview_Complete' || interviewStatus === 'Tech_Done') return 'Tech_Done'
  if (interviewStatus === 'Screening_Done' && candidateStatus === 'Assessed')      return 'Assessed'
  if (interviewStatus === 'Screening_Done')                                        return 'Screening_Done'
  if (candidateStatus  === 'Shortlisted')                                          return 'Shortlisted'
  return candidateStatus || 'Shortlisted'
}

export default function CandidateDashboard({ status: propStatus }) {
  const navigate = useNavigate()
  const name     = localStorage.getItem('candidate_name') || 'Candidate'

  const [currentStatus, setCurrentStatus] = useState(
    propStatus || localStorage.getItem('candidate_status') || 'Shortlisted'
  )

  useEffect(() => {
    const candidateId = localStorage.getItem('candidate_id')
    if (!candidateId) return

    fetch('/assessment/candidates/list')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(candidates => {
        const me = candidates.find(c => String(c.id) === String(candidateId))
        if (!me) return
        const derived = deriveStatus(me.status, me.interview_status)
        localStorage.setItem('candidate_status', derived)
        setCurrentStatus(derived)
      })
      .catch(() => { /* silently keep localStorage value */ })
  }, [])

  const status = currentStatus

  const handleLogout = () => {
    localStorage.removeItem('candidate_token')
    localStorage.removeItem('candidate_id')
    localStorage.removeItem('candidate_name')
    localStorage.removeItem('candidate_status')
    navigate('/candidate-login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 font-sans">
      {/* Ambient glows */}
      <div className="fixed top-0 left-[20%] w-[600px] h-[300px] bg-sky-300/15 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-[10%] w-[400px] h-[400px] bg-green-300/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 border-b border-sky-200 bg-white/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-sky-600 to-green-600 p-1.5 rounded-lg shadow-md shadow-sky-500/30 ring-1 ring-sky-400/30">
              <Leaf size={16} className="text-white drop-shadow-sm" />
            </div>
            <div>
              <p className="text-[10px] text-sky-500 uppercase tracking-widest font-semibold mb-0">Candidate Portal</p>
              <h1 className="text-base font-bold text-sky-950 leading-tight">Welcome, {name}</h1>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-semibold text-sky-600 hover:text-sky-900 hover:bg-sky-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Status pill */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Current status:&nbsp;
            <span className="text-sky-900 font-bold">{status.replace('_', ' ')}</span>
          </span>
        </div>

        {/* Pipeline */}
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const state    = stageState(stage, status)
            const colors   = colorMap[stage.color]
            const Icon     = stage.icon
            const isActive = state === 'active'
            const isDone   = state === 'done'
            const isLocked = state === 'locked'

            return (
              <div
                key={stage.id}
                className={[
                  'relative rounded-2xl border p-6 transition-all duration-200',
                  isActive ? 'bg-white/95 border-sky-200 hover:-translate-y-1 cursor-pointer' : '',
                  isDone   ? 'bg-white/70 border-sky-100 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg cursor-pointer' : '',
                  isLocked ? 'bg-sky-50/40 border-sky-100/50 opacity-50 grayscale cursor-not-allowed select-none' : '',
                ].join(' ')}
                style={isActive ? { boxShadow: colors.glowShadow } : undefined}
              >
                {/* Step connector */}
                {idx < STAGES.length - 1 && (
                  <span className="absolute left-[2.35rem] bottom-0 translate-y-full w-0.5 h-4 bg-sky-200 z-0" />
                )}

                {/* Action Required ribbon */}
                {isActive && (
                  <div className={`absolute top-4 right-4 flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${colors.actionBadge}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    Action Required
                  </div>
                )}

                <div className="flex items-start gap-4">
                  {/* Icon bubble */}
                  <div
                    className={[
                      'shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
                      isActive ? colors.icon : '',
                      isDone   ? 'bg-emerald-100 text-emerald-600' : '',
                      isLocked ? 'bg-sky-100/50 text-sky-300' : '',
                    ].join(' ')}
                  >
                    {isDone
                      ? <CheckCircle2 size={20} />
                      : isLocked
                        ? <Lock size={18} />
                        : <Icon size={20} />
                    }
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 pr-24">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={['text-base font-semibold', isLocked ? 'text-sky-400/60' : 'text-sky-950'].join(' ')}>
                        Stage {stage.id}: {stage.label}
                      </h2>
                      {isDone && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className={['text-sm mt-1 leading-relaxed', isLocked ? 'text-sky-400/40' : 'text-sky-700/70'].join(' ')}>
                      {stage.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 ml-2 self-center">
                    {isActive && (
                      <button
                        onClick={() => navigate(stage.route)}
                        className={`flex items-center gap-1 text-sm font-bold px-4 py-2 rounded-xl text-white transition-all shadow-md transform hover:-translate-y-0.5 ${colors.bg}`}
                      >
                        Start <ChevronRight size={15} />
                      </button>
                    )}
                    {isDone && (
                      <span className="text-emerald-500">
                        <CheckCircle2 size={22} />
                      </span>
                    )}
                    {isLocked && (
                      <Lock size={16} className="text-sky-300" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-sky-400 mt-10 font-medium">
          Stages unlock automatically as your application progresses. Reach out to HR if you face any issues.
        </p>
      </main>
    </div>
  )
}