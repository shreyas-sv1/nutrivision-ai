import { Link } from 'react-router-dom'

const ARCHITECTURE_STEPS = [
  { label: 'Image Input', sub: '224×224 RGB', icon: '📷', color: '#00d4ff' },
  { label: 'MBConv Blocks', sub: '×16 layers', icon: '⚙️', color: '#4f8ef7' },
  { label: 'SE Attention', sub: 'Channel squeeze', icon: '🔍', color: '#8b5cf6' },
  { label: 'Global AvgPool', sub: 'Feature map', icon: '🔲', color: '#10d494' },
  { label: 'Dense + Softmax', sub: '101 classes', icon: '📊', color: '#f59e0b' },
]

const STATS = [
  { label: 'Model Classes', value: '101', unit: 'foods', color: 'cyan' },
  { label: 'Val Accuracy', value: '85', unit: '%', color: 'green' },
  { label: 'Architecture', value: 'B0', unit: 'EfficientNet', color: 'purple' },
  { label: 'Dataset', value: '75K', unit: 'images', color: 'orange' },
]

const FEATURES = [
  {
    title: 'CNN Food Recognition',
    description: 'EfficientNetB0 trained on Food-101 dataset. The model uses compound scaling to balance depth, width and resolution for optimal accuracy.',
    link: '/food',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5" />
      </svg>
    ),
    gradient: 'from-cyan-500/20 to-blue-500/20',
    border: 'border-cyan-500/20 hover:border-cyan-400/40',
    glow: 'hover:shadow-cyan-500/10',
    tag: 'EfficientNet-B0',
    tagColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  },
  {
    title: 'Nutrition Analysis',
    description: 'After food detection, the system performs instant nutritional lookup across 101 food categories with macro breakdowns.',
    link: '/food',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    gradient: 'from-green-500/20 to-emerald-500/20',
    border: 'border-green-500/20 hover:border-green-400/40',
    glow: 'hover:shadow-green-500/10',
    tag: 'Real-time DB',
    tagColor: 'text-green-400 bg-green-400/10 border-green-400/20',
  },
  {
    title: 'Progress Dashboard',
    description: 'Visualize your daily calorie intake, macro distribution, and nutrition goals with interactive charts powered by Chart.js.',
    link: '/dashboard',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
      </svg>
    ),
    gradient: 'from-purple-500/20 to-pink-500/20',
    border: 'border-purple-500/20 hover:border-purple-400/40',
    glow: 'hover:shadow-purple-500/10',
    tag: 'Analytics',
    tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  },
]

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto space-y-20 pb-20">

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl neural-bg grid-bg min-h-[560px] flex flex-col items-center justify-center text-center px-6 py-20 mt-4">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />

        {/* Model tag */}
        <div className="flex items-center gap-6 mb-8 flex-wrap justify-center">
          <div className="model-badge">
            <div className="status-dot" />
            EfficientNet-B0 · PyTorch
          </div>
          <div className="model-badge" style={{ borderColor: 'rgba(16, 212, 148, 0.3)', color: '#10d494', background: 'rgba(16, 212, 148, 0.08)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Food-101 Dataset
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
          AI-Powered
          <br />
          <span className="hero-gradient">Food Recognition</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Upload a food photo. Our <strong className="text-white">Convolutional Neural Network</strong> identifies the food,
          then returns precise <strong className="text-cyan-400">calorie & macronutrient data</strong> in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/food"
            className="btn-primary flex items-center gap-2 text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Analyze Food Now
          </Link>
          <Link to="/dashboard" className="btn-secondary flex items-center gap-2 text-base">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            View Dashboard
          </Link>
        </div>
      </section>

      {/* ── MODEL STATS ─────────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Model Specifications</p>
          <h2 className="text-3xl font-bold text-white">CNN Architecture Stats</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={`stat-card stat-card-${s.color} text-center`}>
              <p className="text-slate-500 text-xs font-mono uppercase tracking-wider mb-2">{s.label}</p>
              <p className="text-3xl font-black text-white mb-1">{s.value}</p>
              <p className="text-xs text-slate-500">{s.unit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MODEL ARCHITECTURE PIPELINE ─────────────────────── */}
      <section className="glass-card p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">EfficientNet-B0 Pipeline</h2>
            <p className="text-slate-500 text-sm">Convolutional Neural Network Architecture</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {ARCHITECTURE_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1 p-4 rounded-xl border border-white/5 bg-white/2 hover:border-white/10 transition-all group min-w-[110px]">
                <div className="text-2xl mb-1">{step.icon}</div>
                <p className="text-xs font-semibold text-white text-center">{step.label}</p>
                <p className="text-xs font-mono text-slate-500 text-center">{step.sub}</p>
                <div className="w-full h-0.5 rounded mt-1" style={{ background: step.color, opacity: 0.4 }} />
              </div>
              {i < ARCHITECTURE_STEPS.length - 1 && (
                <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid md:grid-cols-3 gap-4 pt-6 border-t border-white/5">
          {[
            { label: 'Preprocessing', value: 'Resize → Normalize (ImageNet stats)', icon: '🔧' },
            { label: 'Inference', value: 'torch.no_grad() → Softmax probabilities', icon: '⚡' },
            { label: 'Confidence', value: 'Top-1 & Top-5 predictions returned', icon: '📈' },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-semibold text-white mb-0.5">{item.label}</p>
                <p className="text-xs text-slate-500 font-mono">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE CARDS ───────────────────────────────────── */}
      <section>
        <div className="text-center mb-10">
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">Features</p>
          <h2 className="text-3xl font-bold text-white">What This ML App Does</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              to={f.link}
              className={`group relative glass-card p-6 border ${f.border} transition-all duration-400 hover:-translate-y-2 hover:shadow-2xl ${f.glow} flex flex-col gap-4`}
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                {f.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">{f.title}</h3>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${f.tagColor}`}>{f.tag}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 group-hover:text-cyan-400 transition-colors text-sm font-medium">
                Explore
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TECH STACK ──────────────────────────────────────── */}
      <section className="text-center">
        <p className="text-xs text-slate-600 font-mono uppercase tracking-widest mb-6">Powered By</p>
        <div className="inline-flex flex-wrap justify-center gap-3">
          {[
            { name: 'PyTorch', icon: '🔥', color: 'text-orange-400 border-orange-400/20 bg-orange-400/5' },
            { name: 'EfficientNet', icon: '🧠', color: 'text-blue-400 border-blue-400/20 bg-blue-400/5' },
            { name: 'FastAPI', icon: '⚡', color: 'text-green-400 border-green-400/20 bg-green-400/5' },
            { name: 'React + Vite', icon: '⚛️', color: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5' },
            { name: 'Food-101', icon: '🍽️', color: 'text-pink-400 border-pink-400/20 bg-pink-400/5' },
            { name: 'scikit-learn', icon: '📐', color: 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5' },
          ].map((tech) => (
            <div key={tech.name} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium font-mono ${tech.color}`}>
              <span>{tech.icon}</span>
              <span>{tech.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
