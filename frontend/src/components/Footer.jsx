import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#050810] mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">NutriVision AI</p>
              <p className="text-xs text-slate-500 font-mono">EfficientNet-B0 · Food-101 · PyTorch</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/" className="hover:text-slate-300 transition-colors">Home</Link>
            <Link to="/food" className="hover:text-slate-300 transition-colors">Food Analysis</Link>
            <Link to="/dashboard" className="hover:text-slate-300 transition-colors">Dashboard</Link>
          </div>

          {/* Tech badges */}
          <div className="flex items-center gap-2 font-mono text-xs text-slate-600">
            <span>🔥 PyTorch</span>
            <span>·</span>
            <span>⚡ FastAPI</span>
            <span>·</span>
            <span>⚛️ React</span>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-700 font-mono">
          CNN-based Food Recognition · EfficientNet-B0 trained on Food-101 dataset · 101 food classes
        </div>
      </div>
    </footer>
  )
}
