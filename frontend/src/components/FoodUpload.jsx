import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import toast from 'react-hot-toast'
import { predictFood, predictFoodTopK } from '../api'
import ResultCard from './ResultCard'

export default function FoodUpload() {
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [topK, setTopK] = useState(null)
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState(null)
  const [activeTab, setActiveTab] = useState('single')
  const [analysisTime, setAnalysisTime] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    if (rejectedFiles.length > 0) {
      toast.error('Invalid file. Please upload a JPEG, PNG, or WebP image under 5MB.')
      return
    }
    const f = acceptedFiles[0]
    if (f) {
      setFile(f)
      setPreview(URL.createObjectURL(f))
      setResult(null)
      setTopK(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  const handleAnalyze = async () => {
    if (!file) { toast.error('Please upload an image first.'); return }
    setLoading(true)
    const startTime = Date.now()
    try {
      const [single, multi] = await Promise.all([
        predictFood(file),
        predictFoodTopK(file, 5)
      ])
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
      setResult(single)
      setTopK(multi.predictions || [])
      setAnalysisTime(elapsed)
      toast.success(`🎯 Detected: ${single.food}`)

      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem('foodHistory') || '[]')
      existing.unshift({ ...single, timestamp: Date.now() })
      localStorage.setItem('foodHistory', JSON.stringify(existing.slice(0, 50)))
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to analyze. Make sure the backend is running.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setTopK(null)
    setAnalysisTime(null)
  }

  const handleCapture = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const f = e.target.files[0]
      if (f) { setFile(f); setPreview(URL.createObjectURL(f)); setResult(null); setTopK(null) }
    }
    input.click()
  }

  return (
    <div className="max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="model-badge">
            <div className="status-dot" />
            CNN · EfficientNet-B0
          </div>
        </div>
        <h1 className="text-4xl font-black text-white mb-3">Food Calorie Analyzer</h1>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Upload a food image. The ML model will identify the food and return detailed nutritional analysis.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">

        {/* ── LEFT: Upload Panel ── */}
        <div className="space-y-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`dropzone min-h-[320px] flex flex-col items-center justify-center p-8 transition-all duration-300 ${isDragActive ? 'dropzone-active scan-overlay' : ''}`}
          >
            <input {...getInputProps()} />
            {preview ? (
              <div className="w-full h-full flex flex-col items-center gap-4">
                <div className="relative w-full max-h-[280px] rounded-xl overflow-hidden">
                  <img src={preview} alt="Food preview" className="w-full h-full object-contain max-h-[260px]" />
                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center scan-overlay rounded-xl">
                      <div className="text-center space-y-2">
                        <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-cyan-400 text-sm font-mono">Analyzing...</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-xs font-mono">{file?.name} · {(file?.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div className="text-center space-y-5">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center animate-float">
                  <svg className="w-10 h-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div>
                  {isDragActive
                    ? <p className="text-cyan-400 font-semibold text-lg">Drop it here!</p>
                    : (
                      <>
                        <p className="text-white font-semibold text-base">Drop your food image here</p>
                        <p className="text-slate-500 text-sm mt-1">or click to browse files</p>
                      </>
                    )
                  }
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 font-mono">
                  <span className="px-2 py-1 rounded bg-white/3 border border-white/5">JPEG</span>
                  <span className="px-2 py-1 rounded bg-white/3 border border-white/5">PNG</span>
                  <span className="px-2 py-1 rounded bg-white/3 border border-white/5">WebP</span>
                  <span className="text-slate-700">Max 5MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              id="analyze-food-btn"
              onClick={handleAnalyze}
              disabled={!file || loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="font-mono text-sm">Running Inference...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Run ML Analysis
                </>
              )}
            </button>
            <button
              onClick={handleCapture}
              className="btn-secondary px-4"
              title="Use camera"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </button>
            {preview && (
              <button onClick={handleReset} className="btn-secondary px-4 hover:border-red-500/30 hover:text-red-400" title="Reset">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Model Info Panel */}
          <div className="glass-card p-5 space-y-3">
            <p className="text-xs font-mono text-slate-500 uppercase tracking-wider">ML Model Info</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { k: 'Architecture', v: 'EfficientNet-B0' },
                { k: 'Framework', v: 'PyTorch 2.2+' },
                { k: 'Input Size', v: '224 × 224 px' },
                { k: 'Output', v: '101 classes (softmax)' },
                { k: 'Dataset', v: 'Food-101' },
                { k: 'Optimizer', v: 'Adam / LR Scheduler' },
              ].map(({ k, v }) => (
                <div key={k} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs font-mono text-slate-300">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results Panel ── */}
        <div>
          {loading ? (
            <SkeletonLoader />
          ) : result ? (
            <div className="space-y-5 animate-fade-in-up">
              {/* Tab Switcher */}
              {topK && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('single')}
                    className={`pill-tab ${activeTab === 'single' ? 'pill-tab-active' : ''}`}
                  >
                    🎯 Top Prediction
                  </button>
                  <button
                    onClick={() => setActiveTab('topk')}
                    className={`pill-tab ${activeTab === 'topk' ? 'pill-tab-active' : ''}`}
                  >
                    📊 Top-5 Candidates
                  </button>
                </div>
              )}

              {/* Inference time badge */}
              {analysisTime && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-green-400/10 border border-green-400/20 text-green-400 px-3 py-1 rounded-full text-xs font-mono">
                    ⚡ Inference: {analysisTime}s
                  </div>
                </div>
              )}

              {activeTab === 'single' ? (
                <ResultCard result={result} />
              ) : (
                <TopKCard predictions={topK} />
              )}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ── */

function EmptyState() {
  return (
    <div className="glass-card flex flex-col items-center justify-center min-h-[500px] p-10 text-center">
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/5 flex items-center justify-center mb-6 animate-float">
        <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-400 mb-2">Waiting for ML Input</h3>
      <p className="text-slate-600 text-sm max-w-xs">Upload a food image and click "Run ML Analysis" to get nutritional predictions</p>
      <div className="mt-8 flex flex-col gap-2 w-full max-w-xs text-left">
        {['Upload food image (JPEG/PNG)', 'Click "Run ML Analysis"', 'View calorie & macro results', 'Switch to Top-5 Candidates'].map((step, i) => (
          <div key={step} className="flex items-center gap-3 text-xs text-slate-600">
            <span className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-slate-600 font-mono flex-shrink-0">{i + 1}</span>
            {step}
          </div>
        ))}
      </div>
    </div>
  )
}

function TopKCard({ predictions }) {
  if (!predictions?.length) return null
  const colors = ['#00d4ff', '#4f8ef7', '#8b5cf6', '#10d494', '#f59e0b']

  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white">Top-5 Model Predictions</h3>
        <p className="text-slate-500 text-xs font-mono mt-0.5">Softmax probability distribution across candidate classes</p>
      </div>
      <div className="space-y-4">
        {predictions.map((pred, i) => (
          <div key={pred.food} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-600 w-4">#{i + 1}</span>
                <span className="text-sm font-medium text-white">{pred.food}</span>
                {i === 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 font-mono">best</span>
                )}
              </div>
              <span className="text-sm font-mono font-bold" style={{ color: colors[i] }}>
                {(pred.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="prediction-bar-bg h-2 rounded">
              <div
                className="prediction-bar-fill"
                style={{ width: `${pred.confidence * 100}%`, background: `linear-gradient(90deg, ${colors[i]}80, ${colors[i]})` }}
              />
            </div>
            <p className="text-xs text-slate-600 font-mono pl-6">
              {pred.calories} kcal · P: {pred.protein}g · C: {pred.carbs}g · F: {pred.fat}g
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="glass-card p-6 space-y-5 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-32 h-5 shimmer rounded-lg" />
        <div className="w-20 h-5 shimmer rounded-lg" />
      </div>
      <div className="h-14 w-full shimmer rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 shimmer rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 shimmer rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 shimmer rounded w-3/4" />
            <div className="h-2 shimmer rounded w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
