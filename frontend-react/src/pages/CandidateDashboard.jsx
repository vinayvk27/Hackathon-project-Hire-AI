import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, FileText, Video, Users, Lock, ChevronRight, CheckCircle2, LogOut } from 'lucide-react'

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
    color: 'blue',
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
    ring:        'ring-emerald-500',
    bg:          'bg-emerald-600 hover:bg-emerald-700',
    icon:        'bg-emerald-500/20 text-emerald-400',
    badge:       'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    actionBadge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40',
    glowShadow:  '0 0 0 2px rgba(16,185,129,0.5), 0 0 28px rgba(16,185,129,0.25), 0 8px 32px rgba(0,0,0,0.5)',
  },
  blue: {
    ring:        'ring-blue-500',
    bg:          'bg-blue-600 hover:bg-blue-700',
    icon:        'bg-blue-500/20 text-blue-400',
    badge:       'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    actionBadge: 'bg-blue-500/15 text-blue-400 border border-blue-500/40',
    glowShadow:  '0 0 0 2px rgba(59,130,246,0.5), 0 0 28px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.5)',
  },
  violet: {
    ring:        'ring-violet-500',
    bg:          'bg-violet-600 hover:bg-violet-700',
    icon:        'bg-violet-500/20 text-violet-400',
    badge:       'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    actionBadge: 'bg-violet-500/15 text-violet-400 border border-violet-500/40',
    glowShadow:  '0 0 0 2px rgba(139,92,246,0.5), 0 0 28px rgba(139,92,246,0.25), 0 8px 32px rgba(0,0,0,0.5)',
  },
  orange: {
    ring:        'ring-orange-500',
    bg:          'bg-orange-600 hover:bg-orange-700',
    icon:        'bg-orange-500/20 text-orange-400',
    badge:       'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    actionBadge: 'bg-orange-500/15 text-orange-400 border border-orange-500/40',
    glowShadow:  '0 0 0 2px rgba(249,115,22,0.5), 0 0 28px rgba(249,115,22,0.25), 0 8px 32px rgba(0,0,0,0.5)',
  },
}

// Derive a single dashboard status from the two backend fields.
// STATUS_ORDER: Shortlisted → Screening_Done → Assessed → Tech_Done → Hired/Rejected
function deriveStatus(candidateStatus, interviewStatus) {
  if (interviewStatus === 'Interview_Complete' || interviewStatus === 'Tech_Done') return 'Tech_Done'
  if (interviewStatus === 'Screening_Done' && candidateStatus === 'Assessed')      return 'Assessed'
  if (interviewStatus === 'Screening_Done')                                         return 'Screening_Done'
  if (candidateStatus  === 'Shortlisted')                                           return 'Shortlisted'
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/60 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-widest mb-0.5">Candidate Portal</p>
            <h1 className="text-lg font-semibold">Welcome, {name}</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {/* Status pill */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full bg-slate-800 text-slate-300 ring-1 ring-slate-700">
            Current status:&nbsp;
            <span className="text-white font-semibold">{status.replace('_', ' ')}</span>
          </span>
        </div>

        {/* Pipeline */}
        <div className="space-y-4">
          {STAGES.map((stage, idx) => {
            const state   = stageState(stage, status)
            const colors  = colorMap[stage.color]
            const Icon    = stage.icon
            const isActive = state === 'active'
            const isDone   = state === 'done'
            const isLocked = state === 'locked'

            return (
              <div
                key={stage.id}
                className={[
                  'relative rounded-2xl border p-6 transition-all duration-200',
                  isActive ? 'bg-slate-800 border-transparent hover:-translate-y-1 cursor-pointer' : '',
                  isDone   ? 'bg-slate-800/50 border-slate-700 hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-xl cursor-pointer' : '',
                  isLocked ? 'bg-slate-800/20 border-slate-800/50 opacity-40 grayscale cursor-not-allowed select-none' : '',
                ].join(' ')}
                style={isActive ? { boxShadow: colors.glowShadow } : undefined}
              >
                {/* Step connector line */}
                {idx < STAGES.length - 1 && (
                  <span className="absolute left-[2.35rem] bottom-0 translate-y-full w-0.5 h-4 bg-slate-700 z-0" />
                )}

                {/* Action Required ribbon — top-right of active card */}
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
                      isActive  ? colors.icon : '',
                      isDone    ? 'bg-emerald-500/15 text-emerald-400' : '',
                      isLocked  ? 'bg-slate-700/30 text-slate-600' : '',
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
                      <h2 className={['text-base font-semibold', isLocked ? 'text-slate-600' : 'text-white'].join(' ')}>
                        Stage {stage.id}: {stage.label}
                      </h2>
                      {isDone && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className={['text-sm mt-1 leading-relaxed', isLocked ? 'text-slate-700' : 'text-slate-400'].join(' ')}>
                      {stage.description}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="shrink-0 ml-2 self-center">
                    {isActive && (
                      <button
                        onClick={() => navigate(stage.route)}
                        className={`flex items-center gap-1 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-colors shadow-lg ${colors.bg}`}
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
                      <Lock size={16} className="text-slate-700" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-slate-600 mt-10">
          Stages unlock automatically as your application progresses. Reach out to HR if you face any issues.
        </p>
      </main>
    </div>
  )
}
