import { useState, useEffect } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js'

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale,
  LinearScale, BarElement, PointElement, LineElement, Filler
)

const DAILY_GOALS = { calories: 2000, protein: 120, carbs: 250, fat: 65 }

function GoalRing({ value, goal, color, label }) {
  const pct = Math.min(value / goal, 1)
  const r = 36, stroke = 6
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
          <circle
            cx="40" cy="40" r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-white leading-none">{Math.round(pct * 100)}%</span>
          <span className="text-[10px] text-slate-500 font-mono">of goal</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs text-slate-500 font-mono">{label}</p>
        <p className="text-sm font-bold text-white">{value}<span className="text-slate-600 text-xs">/{goal}</span></p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [foodHistory, setFoodHistory] = useState([])
  const [activeView, setActiveView] = useState('overview')

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('foodHistory') || '[]')
    setFoodHistory(stored)
  }, [])

  const totalCalories = foodHistory.reduce((s, i) => s + (i.calories || 0), 0)
  const totalProtein = foodHistory.reduce((s, i) => s + (i.protein || 0), 0)
  const totalCarbs = foodHistory.reduce((s, i) => s + (i.carbs || 0), 0)
  const totalFat = foodHistory.reduce((s, i) => s + (i.fat || 0), 0)
  const totalFiber = foodHistory.reduce((s, i) => s + (i.fiber || 0), 0)

  const macroData = {
    labels: ['Protein', 'Carbs', 'Fat'],
    datasets: [{
      data: [totalProtein || 30, totalCarbs || 45, totalFat || 25],
      backgroundColor: ['rgba(0,212,255,0.85)', 'rgba(245,158,11,0.85)', 'rgba(239,68,68,0.85)'],
      borderColor: ['#00d4ff', '#f59e0b', '#ef4444'],
      borderWidth: 2,
      hoverOffset: 10,
    }],
  }

  const calorieData = {
    labels: foodHistory.length > 0
      ? foodHistory.slice(0, 10).reverse().map((_, i) => `Meal ${i + 1}`)
      : ['Breakfast', 'Lunch', 'Snack', 'Dinner'],
    datasets: [{
      label: 'Calories',
      data: foodHistory.length > 0
        ? foodHistory.slice(0, 10).reverse().map(i => i.calories)
        : [350, 520, 180, 450],
      backgroundColor: 'rgba(79, 142, 247, 0.6)',
      borderColor: '#4f8ef7',
      borderRadius: 8,
      borderSkipped: false,
      borderWidth: 0,
    }],
  }

  const proteinTrend = {
    labels: foodHistory.length > 0
      ? foodHistory.slice(0, 7).reverse().map((_, i) => `Meal ${i + 1}`)
      : ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'],
    datasets: [{
      label: 'Protein (g)',
      data: foodHistory.length > 0
        ? foodHistory.slice(0, 7).reverse().map(i => i.protein)
        : [22, 35, 18, 42, 28, 38, 25],
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0, 212, 255, 0.06)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#00d4ff',
      pointBorderColor: '#050810',
      pointBorderWidth: 2,
      pointRadius: 5,
    }],
  }

  const chartDefaults = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#4a5568', font: { size: 11 } }, grid: { display: false }, border: { display: false } },
      y: { ticks: { color: '#4a5568', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } },
    },
  }

  const donutOpts = {
    responsive: true,
    plugins: { legend: { labels: { color: '#64748b', font: { size: 11 }, padding: 16 } } },
    cutout: '70%',
  }

  const clearHistory = () => {
    if (confirm('Clear all food history?')) {
      localStorage.removeItem('foodHistory')
      setFoodHistory([])
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">Analytics</p>
          <h1 className="text-3xl font-black text-white">Nutrition Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Track your ML-analyzed meals and calorie intake</p>
        </div>
        <div className="flex items-center gap-3">
          {foodHistory.length > 0 && (
            <button onClick={clearHistory} className="btn-secondary text-sm py-2">
              🗑 Clear History
            </button>
          )}
          <div className="model-badge">
            <div className="status-dot" />
            {foodHistory.length} meals logged
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'trends', label: '📈 Trends' },
          { id: 'history', label: '🍽 Meal Log' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`pill-tab ${activeView === tab.id ? 'pill-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeView === 'overview' && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Goal Rings */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Daily Goals</h2>
              <span className="text-xs text-slate-500 font-mono">Based on logged meals</span>
            </div>
            <div className="flex flex-wrap gap-8 justify-center md:justify-start">
              <GoalRing value={totalCalories} goal={DAILY_GOALS.calories} color="#00d4ff" label="Calories (kcal)" />
              <GoalRing value={totalProtein} goal={DAILY_GOALS.protein} color="#10d494" label="Protein (g)" />
              <GoalRing value={totalCarbs} goal={DAILY_GOALS.carbs} color="#f59e0b" label="Carbs (g)" />
              <GoalRing value={totalFat} goal={DAILY_GOALS.fat} color="#ef4444" label="Fat (g)" />
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Calories', value: totalCalories || 0, sub: `Goal: ${DAILY_GOALS.calories} kcal`, color: 'cyan', icon: '🔥' },
              { label: 'Protein', value: `${totalProtein || 0}g`, sub: `Goal: ${DAILY_GOALS.protein}g`, color: 'green', icon: '💪' },
              { label: 'Carbohydrates', value: `${totalCarbs || 0}g`, sub: `Goal: ${DAILY_GOALS.carbs}g`, color: 'orange', icon: '⚡' },
              { label: 'Meals Analyzed', value: foodHistory.length, sub: 'by ML model', color: 'purple', icon: '🧠' },
            ].map((s) => (
              <div key={s.label} className={`stat-card stat-card-${s.color}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-xs text-slate-600 font-mono">{s.sub}</span>
                </div>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-1">Macronutrient Distribution</h3>
              <p className="text-xs text-slate-500 font-mono mb-4">Protein · Carbs · Fat split</p>
              <div className="max-w-[220px] mx-auto">
                <Doughnut data={macroData} options={donutOpts} />
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-white mb-1">Calories Per Meal</h3>
              <p className="text-xs text-slate-500 font-mono mb-4">Last {Math.min(foodHistory.length || 4, 10)} meals</p>
              <Bar data={calorieData} options={chartDefaults} />
            </div>
          </div>
        </div>
      )}

      {/* ── TRENDS ── */}
      {activeView === 'trends' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Protein Intake Trend</h3>
            <p className="text-xs text-slate-500 font-mono mb-6">Grams of protein per analyzed meal</p>
            <Line data={proteinTrend} options={{
              ...chartDefaults,
              plugins: { legend: { display: false } },
            }} />
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Nutritional Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg. Calories/Meal', value: foodHistory.length ? Math.round(totalCalories / foodHistory.length) : 0, unit: 'kcal', color: '#00d4ff' },
                { label: 'Avg. Protein/Meal', value: foodHistory.length ? Math.round(totalProtein / foodHistory.length) : 0, unit: 'g', color: '#10d494' },
                { label: 'Total Fiber', value: Math.round(totalFiber), unit: 'g', color: '#8b5cf6' },
                { label: 'ML Analyses', value: foodHistory.length, unit: 'meals', color: '#f59e0b' },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-xl border border-white/5 bg-white/2 text-center">
                  <p className="text-2xl font-black mb-0.5" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-slate-500 font-mono">{item.unit}</p>
                  <p className="text-xs text-slate-600 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MEAL LOG ── */}
      {activeView === 'history' && (
        <div className="animate-fade-in-up">
          <div className="glass-card overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">ML Analyzed Meals</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {foodHistory.length} foods detected by EfficientNet-B0
                </p>
              </div>
            </div>
            {foodHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Food (ML Predicted)</th>
                      <th className="text-right">Confidence</th>
                      <th className="text-right">Calories</th>
                      <th className="text-right">Protein</th>
                      <th className="text-right">Carbs</th>
                      <th className="text-right">Fat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {foodHistory.map((item, i) => {
                      const conf = Math.round((item.confidence || 0) * 100)
                      return (
                        <tr key={i}>
                          <td className="text-slate-600 font-mono text-xs">{i + 1}</td>
                          <td className="font-semibold text-white">{item.food}</td>
                          <td className="text-right">
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded-full" style={{
                              color: conf >= 80 ? '#10d494' : conf >= 60 ? '#f59e0b' : '#ef4444',
                              background: conf >= 80 ? 'rgba(16,212,148,0.1)' : conf >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                            }}>
                              {conf}%
                            </span>
                          </td>
                          <td className="text-right font-bold text-white">{item.calories}</td>
                          <td className="text-right text-cyan-400 font-mono text-sm">{item.protein}g</td>
                          <td className="text-right text-amber-400 font-mono text-sm">{item.carbs}g</td>
                          <td className="text-right text-red-400 font-mono text-sm">{item.fat}g</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/5 flex items-center justify-center mx-auto text-2xl">🍽️</div>
                <p className="text-slate-400 font-medium">No meals analyzed yet</p>
                <p className="text-slate-600 text-sm">Go to Food Analysis and upload food images to start tracking.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
