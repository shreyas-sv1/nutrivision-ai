import { Doughnut, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement)

const MACRO_COLORS = {
  protein: { fill: '#00d4ff', light: 'rgba(0,212,255,0.15)', label: 'text-cyan-400', bg: 'bg-cyan-400/10' },
  carbs:   { fill: '#f59e0b', light: 'rgba(245,158,11,0.15)', label: 'text-amber-400', bg: 'bg-amber-400/10' },
  fat:     { fill: '#ef4444', light: 'rgba(239,68,68,0.15)', label: 'text-red-400', bg: 'bg-red-400/10' },
  fiber:   { fill: '#10d494', light: 'rgba(16,212,148,0.15)', label: 'text-green-400', bg: 'bg-green-400/10' },
}

function ProgressRing({ value, max, color, size = 80, stroke = 7 }) {
  const radius = (size - stroke * 2) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circ * (1 - pct)
  return (
    <svg width={size} height={size} className="progress-ring">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="progress-ring-circle"
        style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
      />
    </svg>
  )
}

export default function ResultCard({ result }) {
  if (!result) return null

  const confidencePercent = Math.round(result.confidence * 100)
  const total = (result.protein + result.carbs + result.fat) || 1

  const macroData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [result.protein, result.carbs, result.fat],
      backgroundColor: ['rgba(0,212,255,0.85)', 'rgba(245,158,11,0.85)', 'rgba(239,68,68,0.85)'],
      borderColor: ['#0891b2', '#d97706', '#dc2626'],
      borderWidth: 2,
      hoverOffset: 10,
    }],
  }

  const barData = {
    labels: ['Protein', 'Carbs', 'Fat', 'Fiber'],
    datasets: [{
      label: 'Grams',
      data: [result.protein, result.carbs, result.fat, result.fiber || 0],
      backgroundColor: ['rgba(0,212,255,0.7)', 'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)', 'rgba(16,212,148,0.7)'],
      borderRadius: 8,
      borderSkipped: false,
    }],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: '#64748b', font: { size: 11 } } },
    },
  }

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false }, border: { display: false } },
      y: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { display: false } },
    },
  }

  const macros = [
    { key: 'protein', label: 'Protein', value: result.protein, unit: 'g', ...MACRO_COLORS.protein },
    { key: 'carbs', label: 'Carbohydrates', value: result.carbs, unit: 'g', ...MACRO_COLORS.carbs },
    { key: 'fat', label: 'Total Fat', value: result.fat, unit: 'g', ...MACRO_COLORS.fat },
    { key: 'fiber', label: 'Dietary Fiber', value: result.fiber || 0, unit: 'g', ...MACRO_COLORS.fiber },
  ]

  return (
    <div className="glass-card p-6 space-y-6 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">{result.food}</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{result.serving}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs font-mono text-slate-500">CNN Confidence</span>
          <span className="text-lg font-bold" style={{ color: confidencePercent >= 80 ? '#10d494' : confidencePercent >= 60 ? '#f59e0b' : '#ef4444' }}>
            {confidencePercent}%
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Model confidence</span>
          <span className="text-xs font-mono text-slate-400">{result.confidence?.toFixed(4)}</span>
        </div>
        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{
              width: `${confidencePercent}%`,
              background: confidencePercent >= 80
                ? 'linear-gradient(90deg, #10d494, #06b6d4)'
                : confidencePercent >= 60
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : 'linear-gradient(90deg, #ef4444, #dc2626)'
            }}
          />
        </div>
        {result.warning && (
          <p className="text-xs text-amber-400 mt-1.5 flex items-center gap-1">
            <span>⚠️</span>{result.warning}
          </p>
        )}
      </div>

      {/* Calories Hero */}
      <div className="relative rounded-2xl overflow-hidden p-5 text-center" style={{
        background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(79,142,247,0.08))',
        border: '1px solid rgba(0,212,255,0.2)',
      }}>
        <p className="text-xs font-mono text-cyan-500 uppercase tracking-widest mb-1">Total Calories</p>
        <p className="text-5xl font-black text-white">{result.calories}</p>
        <p className="text-sm text-slate-500 mt-1">kcal per serving</p>
      </div>

      {/* Macros with Rings */}
      <div className="grid grid-cols-2 gap-3">
        {macros.map((m) => (
          <div key={m.key} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/2">
            <div className="relative flex-shrink-0">
              <ProgressRing value={m.value} max={Math.max(result.protein, result.carbs, result.fat, result.fiber || 1) * 1.2} color={m.fill} size={52} stroke={5} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold" style={{ color: m.fill }}>{m.value}g</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
              <p className="text-sm font-bold text-white">{m.value}<span className="text-xs text-slate-500 ml-0.5">g</span></p>
              <p className="text-xs text-slate-600">{total > 0 ? Math.round((m.value / total) * 100) : 0}% of macros</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <p className="text-xs text-slate-500 text-center font-mono">Macro Split</p>
          <div className="max-w-[160px] mx-auto">
            <Doughnut data={macroData} options={chartOptions} />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-slate-500 text-center font-mono">Nutrients (g)</p>
          <Bar data={barData} options={barOptions} />
        </div>
      </div>

      {/* Matched As Note */}
      {result.matched_as && (
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono p-3 rounded-lg bg-white/2 border border-white/5">
          <span>ℹ️</span>
          Nutrition matched as: <span className="text-slate-300">{result.matched_as}</span>
        </div>
      )}
    </div>
  )
}
