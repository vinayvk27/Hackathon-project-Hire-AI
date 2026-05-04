import { NavLink, useNavigate } from 'react-router-dom'
import { FileText, Users, LogOut, Briefcase, Leaf, BarChart2, List } from 'lucide-react'
import clsx from 'clsx'

// Kept the routing data from Code 2 (includes '/jobs' - Saved JDs)
const navItems = [
  { to: '/jd',         icon: FileText,  label: 'JD Generator'   },
  { to: '/jobs',       icon: List,      label: 'Saved JDs'      },
  { to: '/match',      icon: Users,     label: 'Resume Matcher' },
  { to: '/candidates', icon: Briefcase, label: 'Candidates'     },
  { to: '/pipeline',   icon: BarChart2, label: 'Pipeline'       },
]

export default function Sidebar() {
  // Logic remains entirely untouched
  const navigate = useNavigate()
  const role = localStorage.getItem('hire_ai_role') || 'candidate'
  const isAdmin = role === 'hr_manager'

  const logout = () => {
    localStorage.removeItem('hire_ai_auth')
    localStorage.removeItem('hire_ai_role')
    navigate('/login')
  }

  // Frontend display replaced with Code 1's animated gradient layout
  return (
    <aside className="group w-16 hover:w-60 h-screen shrink-0 flex flex-col overflow-hidden transition-all duration-300 ease-in-out z-30
      bg-gradient-to-b from-sky-200/90 via-sky-100 to-sky-50
      border-r border-sky-300/60
      shadow-[2px_0_16px_rgba(14,165,233,0.15)]">

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sky-200/60">
        <div className="shrink-0 bg-gradient-to-tr from-sky-600 to-green-600 p-1.5 rounded-lg shadow-md shadow-sky-500/30 ring-1 ring-sky-400/30">
          <Leaf size={18} className="text-white drop-shadow-sm" />
        </div>
        <span className="whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 text-sky-950 font-extrabold text-lg tracking-tight">
          Hire AI
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.filter(() => isAdmin).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-sky-500 to-green-500 text-white shadow-md shadow-sky-500/25'
                  : 'text-sky-700/70 hover:text-sky-900 hover:bg-sky-100/80'
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300">
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-sky-200/60">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-2.5 py-2.5 w-full rounded-xl text-sm font-semibold text-sky-700/70 hover:text-sky-900 hover:bg-sky-100/80 transition-colors duration-200"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300">
            Logout
          </span>
        </button>
      </div>
    </aside>
  )
}