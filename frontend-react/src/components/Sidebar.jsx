import { NavLink, useNavigate } from 'react-router-dom'
import { FileText, Users, LogOut, Briefcase } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/jd',         icon: FileText, label: 'JD Generator'    },
  { to: '/match',      icon: Users,    label: 'Resume Matcher'  },
  { to: '/candidates', icon: Briefcase, label: 'Candidates'     },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const role = localStorage.getItem('hire_ai_role') || 'candidate'
  const isAdmin = role === 'hr_manager'

  const logout = () => {
    localStorage.removeItem('hire_ai_auth')
    localStorage.removeItem('hire_ai_role')
    navigate('/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <Briefcase className="text-brand-500" size={22} />
        <span className="text-white font-bold text-lg tracking-tight">Hire AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.filter(() => isAdmin).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  )
}
