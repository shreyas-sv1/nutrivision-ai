import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  const linkClass = ({ isActive }) =>
    `px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 block ${
      isActive
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
    }`

  return (
    <>
      <nav className="navbar sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
              <div className="relative w-9 h-9">
                <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-1.673.278a2.25 2.25 0 01-2.293-1.124L12 19.9l-1.17 2.165a2.25 2.25 0 01-2.293 1.124l-1.673-.278c-1.717-.293-2.299-2.38-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#050810] animate-pulse" />
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-bold text-white tracking-tight">NutriVision AI</div>
                <div className="text-xs text-slate-500 font-mono">EfficientNet-B0 · CNN</div>
              </div>
            </NavLink>

            {/* Center: Model Status Badge */}
            <div className="hidden md:flex items-center gap-2 model-badge">
              <div className="status-dot" />
              ML Model Active
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              <NavLink to="/" className={linkClass} end>Home</NavLink>
              <NavLink to="/food" className={linkClass}>Food Analysis</NavLink>
              <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 md:hidden z-40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-72 bg-[#080c18] border-l border-white/5 shadow-2xl z-50 md:hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611l-1.673.278a2.25 2.25 0 01-2.293-1.124L12 19.9l-1.17 2.165a2.25 2.25 0 01-2.293 1.124l-1.673-.278c-1.717-.293-2.299-2.38-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <span className="font-bold text-white">NutriVision AI</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-2">
              <NavLink to="/" className={linkClass} end onClick={() => setMobileOpen(false)}>🏠 Home</NavLink>
              <NavLink to="/food" className={linkClass} onClick={() => setMobileOpen(false)}>🧠 Food Analysis</NavLink>
              <NavLink to="/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>📊 Dashboard</NavLink>
            </div>
            <div className="absolute bottom-8 left-5 right-5">
              <div className="model-badge justify-center">
                <div className="status-dot" />
                EfficientNet-B0 Active
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
