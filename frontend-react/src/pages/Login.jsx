import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Video, Phone, FileText, Code, Globe, Users, X, Leaf, ChevronRight } from 'lucide-react';
import api from '../api/client';

const services = [
  {
    title: 'AI Video Interviewer',
    description: 'Conducts, records, proctors, and evaluates in a structured video interview.',
    features: ['Real-time proctoring', 'Behavioral analysis', 'Automated scoring'],
    icon: Video,
  },
  {
    title: 'AI Phone Screener',
    description: 'Automates candidate screenings, evaluates responses, and provides a score.',
    features: ['Natural language processing', 'Sentiment analysis', 'Instant shortlisting'],
    icon: Phone,
  },
  {
    title: 'AI Resume Screener',
    description: 'Instantly filters, analyzes and ranks resumes against job requirements.',
    features: ['Contextual keyword matching', 'Skill gap analysis', 'Bias-free filtering'],
    icon: FileText,
  },
  {
    title: 'AI Coding Interviewer',
    description: 'Conducts live adaptive coding assessments to evaluate technical skills.',
    features: ['Live IDE execution', 'Adaptive difficulty', 'Plagiarism detection'],
    icon: Code,
  },
  {
    title: 'English Proficiency',
    description: "Assess candidates' language skills including fluency and grammar.",
    features: ['CEFR alignment', 'Pronunciation scoring', 'Fluency assessment'],
    icon: Globe,
  },
  {
    title: 'Virtual Platform',
    description: 'AI-powered interview copilot with real-time evaluation and whiteboard.',
    features: ['Built-in whiteboard', 'Collaborative coding', 'AI Interview copilot'],
    icon: Users,
  },
];

export default function Home() {
  // --- STATE FROM CODE 2 ---
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginType, setLoginType] = useState('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- LOGIC FROM CODE 2 (Untouched) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (loginType === 'candidate') {
        const res = await api.post('/assessment/login', { username, password });
        const { access_token, candidate_id, name, status } = res.data;
        const ALLOWED = ['Shortlisted', 'Screening_Done', 'Assessed', 'Tech_Done'];
        if (!ALLOWED.includes(status)) {
          setError(`Your application status is "${status}". Access is not available at this stage.`);
          return;
        }
        localStorage.setItem('candidate_token', access_token);
        localStorage.setItem('candidate_id', candidate_id);
        localStorage.setItem('candidate_name', name);
        localStorage.setItem('candidate_status', status);
        setIsLoginModalOpen(false);
        navigate('/dashboard');
      } else {
        const { data } = await api.post('/api/login', { username, password });
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('hire_ai_auth', 'true');
        localStorage.setItem('hire_ai_role', data.role || 'hr_manager');
        localStorage.setItem('hire_ai_token', data.access_token);
        setIsLoginModalOpen(false);
        navigate('/candidates');
      }
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  // --- UI FROM CODE 1 ---
  return (
    <div className="h-screen bg-gradient-to-br from-sky-50 via-white to-green-50 font-sans text-sky-950 relative overflow-hidden flex flex-col selection:bg-sky-200">

      {/* Full-page background image — very subtle */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: "url('/india-corporate.jpeg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.55,
        }}
      ></div>

      {/* Ambient glows — sky left, green right */}
      <div className="absolute top-[-10%] left-[20%] w-[800px] h-[400px] bg-sky-300/10 rounded-full blur-[60px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[500px] bg-green-300/8 rounded-full blur-[70px] pointer-events-none"></div>

      {/* Floating decorative shapes */}
      <div className="absolute top-[15%] left-[5%] w-16 h-16 bg-sky-200/40 rounded-tr-full rounded-bl-full rotate-45 blur-[2px] pointer-events-none animate-pulse"></div>
      <div className="absolute top-[40%] right-[8%] w-24 h-24 bg-green-200/30 rounded-tl-full rounded-br-full -rotate-12 blur-[4px] pointer-events-none"></div>
      <div className="absolute bottom-[20%] left-[12%] w-20 h-20 bg-sky-200/35 rounded-tr-full rounded-bl-full rotate-[60deg] blur-[3px] pointer-events-none"></div>

      {/* Navigation Bar */}
      <nav className="shrink-0 flex items-center justify-between px-10 py-5 bg-transparent relative z-40">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-sky-600 to-green-600 p-2 rounded-xl shadow-lg shadow-sky-600/50 ring-2 ring-sky-400/40">
            <Leaf size={22} className="text-white drop-shadow-sm" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-sky-900">Hire AI</span>
        </div>
        <div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-sky-500 to-green-500 rounded-full hover:from-sky-400 hover:to-green-400 shadow-md shadow-sky-500/25 hover:shadow-lg hover:shadow-sky-400/40 transition-all transform hover:-translate-y-0.5"
          >
            Login to Portal
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="shrink-0 max-w-5xl mx-auto text-center px-6 pt-6 pb-6 relative z-10 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 text-sky-700 text-xs font-bold mb-4 border border-sky-200 backdrop-blur-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          AI-Powered Hiring Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4 leading-tight drop-shadow-sm">
          Hire Smarter. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-sky-500 to-green-600">
            Build Stronger Teams.
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-700 max-w-2xl font-semibold leading-relaxed">
          Automate interviews, screen resumes, and evaluate candidates in real time — so you can focus on the people worth hiring.
        </p>
      </header>

      {/* Services Grid Section */}
      <section className="flex-1 max-w-7xl w-full mx-auto px-8 pb-8 relative z-10 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 min-h-0 place-items-stretch">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div key={index} className="group relative h-full w-full [perspective:2000px] z-10 hover:z-50 cursor-pointer">

                {/* Inside layer — revealed on hover */}
                <div className="absolute inset-0 w-full h-full bg-white/95 backdrop-blur-xl rounded-3xl border border-sky-200 p-6 flex flex-col justify-center shadow-xl shadow-sky-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                  <h3 className="text-lg font-bold text-sky-900 mb-2 border-b border-green-100 pb-2">{service.title}</h3>
                  <p className="text-sky-700/85 text-sm font-medium leading-relaxed mb-4">
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature, i) => (
                      <li key={i} className="text-xs font-bold text-sky-800 flex items-center gap-2.5">
                        <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Front cover layer */}
                <div className="absolute inset-0 w-full h-full bg-white/90 backdrop-blur-md rounded-3xl border border-sky-200/80 p-6 flex flex-col items-center justify-center text-center origin-left transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] [transform-style:preserve-3d] group-hover:[transform:rotateY(-105deg)] z-20 shadow-xl shadow-sky-900/15 group-hover:shadow-2xl group-hover:shadow-sky-900/25">

                  <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-white/60 via-transparent to-transparent rounded-3xl pointer-events-none"></div>

                  <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-tr from-sky-500 to-green-500 text-white rounded-2xl mb-5 shadow-lg shadow-sky-500/30">
                    <IconComponent size={30} strokeWidth={2} />
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-sky-950">{service.title}</h3>

                  <div className="flex items-center justify-center gap-1.5 mt-2 text-green-600 font-bold uppercase tracking-widest text-[10px] bg-green-50/80 px-4 py-1.5 rounded-full border border-green-200/60 shadow-sm">
                    <span>Explore Inside</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* Login Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sky-950/40 backdrop-blur-md p-4">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300 max-h-[90vh]">

            <button
              onClick={() => setIsLoginModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-sky-600 hover:bg-sky-50 transition-colors z-20 bg-white/80 rounded-full p-1.5 md:bg-transparent"
            >
              <X size={20} strokeWidth={2.5} />
            </button>

            {/* Left Panel — Brand */}
            <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-10 text-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-700 via-sky-500 to-green-600"></div>
              <div className="absolute inset-0 bg-[url('/india-corporate.jpeg')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-green-900/40 via-transparent to-transparent"></div>

              <div className="relative z-10 mt-6">
                <div className="bg-white/40 w-12 h-12 flex items-center justify-center rounded-xl mb-6 backdrop-blur-sm border border-white/50 shadow-lg shadow-sky-900/20">
                  <Leaf size={24} className="text-white drop-shadow" />
                </div>
                <h2 className="text-4xl font-extrabold mb-3 leading-tight text-white">Cultivate <br />Great Talent.</h2>
                <p className="text-green-100 text-base font-medium">Embark on your next great career journey with our smart platform.</p>
              </div>

              {/* Feature image */}
              <div className="relative z-10 flex-1 flex items-center justify-center py-4">
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl shadow-sky-950/40 border border-white/20 ring-2 ring-white/10">
                  <img
                    src="/india-corporate.jpeg"
                    alt="Indian corporate professionals"
                    className="w-full h-40 object-cover"
                  />
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 flex items-center gap-3 border-t border-white/10">
                    <div className="flex -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-sky-300 border-2 border-white/40 flex items-center justify-center text-xs font-bold text-sky-900">A</div>
                      <div className="w-7 h-7 rounded-full bg-green-300 border-2 border-white/40 flex items-center justify-center text-xs font-bold text-green-900">B</div>
                      <div className="w-7 h-7 rounded-full bg-white/60 border-2 border-white/40 flex items-center justify-center text-xs font-bold text-sky-800">C</div>
                    </div>
                    <p className="text-white/80 text-xs font-semibold">500+ companies trust Hire AI</p>
                  </div>
                </div>
              </div>

              <div className="relative z-10 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 mb-2">
                <h3 className="font-bold text-lg mb-2 text-white flex items-center gap-2">
                  <Users size={18} /> Discover, Evaluate, Hire
                </h3>
                <p className="text-sky-100 text-sm leading-relaxed opacity-90">
                  Unlock AI-powered screening, exclusive talent insights, and a streamlined hiring experience.
                </p>
              </div>
            </div>

            {/* Right Panel — Form */}
            <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white relative overflow-y-auto">

              {/* Role toggle */}
              <div className="flex bg-sky-50 p-1 rounded-xl mb-8 shrink-0 border border-sky-100">
                <button
                  type="button"
                  onClick={() => { setLoginType('candidate'); setUsername(''); setPassword(''); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginType === 'candidate' ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-700/60 hover:text-sky-600'}`}
                >
                  Candidate
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginType('admin'); setUsername(''); setPassword(''); setError(''); }}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginType === 'admin' ? 'bg-white text-sky-600 shadow-sm' : 'text-sky-700/60 hover:text-sky-600'}`}
                >
                  Administrator
                </button>
              </div>

              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
                <p className="text-sm text-gray-500 font-medium">Please enter your details to sign in.</p>
              </div>

              <button type="button" className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors mb-6 text-sm font-bold text-gray-700">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue With Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-gray-100"></div>
                <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">OR</span>
                <div className="flex-1 h-px bg-gray-100"></div>
              </div>

              {/* Using Code 2's API submit logic */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">
                    Username
                  </label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-gray-900 font-medium placeholder:text-gray-400 text-sm"
                    type="text"
                    placeholder={loginType === 'candidate' ? 'e.g. ananya_iyer' : 'hw_demo'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 ml-1">Password</label>
                  <input
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all text-gray-900 font-medium placeholder:text-gray-400 text-sm"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="remember" className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500" />
                    <label htmlFor="remember" className="text-xs text-gray-500 font-medium cursor-pointer">
                      Remember me
                    </label>
                  </div>
                  <span className="text-xs font-bold text-green-600 hover:text-green-700 cursor-pointer">Forgot Password?</span>
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-2.5 rounded-xl text-center font-semibold">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-green-500 hover:from-sky-400 hover:to-green-400 text-white font-bold rounded-xl shadow-lg shadow-sky-500/30 transition-all mt-6 disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? 'Authenticating...' : `Login as ${loginType === 'candidate' ? 'Candidate' : 'Admin'}`}
                </button>

                {/* Retained Demo Hint from Code 2, styled for Code 1 */}
                <div className="mt-6 bg-sky-50/60 rounded-xl px-4 py-3 border border-sky-100/80">
                  {loginType === 'candidate' ? (
                    <div className="text-center">
                      <p className="text-sky-800 text-xs font-bold mb-1">Candidate login</p>
                      <p className="text-sky-600 text-xs font-medium">Use your registered username and password.</p>
                    </div>
                  ) : (
                    <div className="text-center flex flex-col items-center">
                      <p className="text-sky-800 text-xs font-bold mb-1">Demo accounts</p>
                      <p className="text-sky-600 text-xs font-mono font-medium bg-white px-2 py-0.5 rounded shadow-sm border border-sky-100 mb-1.5">
                        hw_demo <span className="text-sky-300">·</span> design_demo <span className="text-sky-300">·</span> hr_demo
                      </p>
                      <p className="text-sky-700 text-xs font-medium">
                        Password: <span className="text-sky-900 font-mono font-bold">password123</span>
                      </p>
                    </div>
                  )}
                </div>

              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}