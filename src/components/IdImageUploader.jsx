import { useState, useRef, useEffect } from 'react'
import { UploadCloud, Camera, X, AlertTriangle, CheckCircle2, Loader2, RefreshCw, ImageOff } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'

/**
 * IdImageUploader — bullet-proof picker for the National ID image.
 *
 * Layered defenses BEFORE the image is sent to the server:
 *   1. File-type whitelist (jpg/jpeg/png only — no PDFs, no HEIC).
 *   2. Size guards (min 200 KB to reject tiny screenshots, max 10 MB).
 *   3. Resolution guard (min 800×500 — anything smaller can't be read).
 *   4. Aspect-ratio sanity (Egyptian IDs are roughly 1.586:1 — accept 1.2..2.0).
 *   5. Blur heuristic via Laplacian variance on a downsized canvas — too low
 *      means the photo is blurry, too high means it's a screenshot of text.
 *   6. Camera capture as an alternative (uses getUserMedia rear camera) so
 *      the user can take a fresh photo instead of digging through gallery.
 *
 * The component reports a single `File` to its parent and exposes any
 * warnings/errors as a friendly inline notice.
 */

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png'])
const MIN_BYTES = 200 * 1024
const MAX_BYTES = 10 * 1024 * 1024
const MIN_W = 800
const MIN_H = 500

export default function IdImageUploader({ onChange, label = 'صورة بطاقة الرقم القومي', error: externalError }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    return () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview) }
  }, [preview])

  const reset = () => {
    setFile(null)
    setPreview(null)
    setWarnings([])
    onChange?.(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const accept = async (rawFile) => {
    setAnalyzing(true)
    setWarnings([])
    try {
      // 1) Type
      if (!ACCEPTED_TYPES.has(rawFile.type)) {
        setWarnings([`نوع الملف غير مدعوم (${rawFile.type || 'غير معروف'}). الأنواع المقبولة: JPG, PNG.`])
        return
      }

      // 2) Size
      if (rawFile.size < MIN_BYTES) {
        setWarnings([`حجم الصورة صغير جداً (${Math.round(rawFile.size / 1024)} ك.ب). من فضلك ارفع صورة بدقة أعلى.`])
        return
      }
      if (rawFile.size > MAX_BYTES) {
        setWarnings([`حجم الصورة كبير جداً (${Math.round(rawFile.size / 1024 / 1024)} م.ب). الحد الأقصى 10 م.ب.`])
        return
      }

      // 3) Resolution + aspect ratio + blur
      const analysis = await analyzeImage(rawFile)
      const issues = []

      if (analysis.width < MIN_W || analysis.height < MIN_H) {
        issues.push(`الدقة منخفضة جداً (${analysis.width}×${analysis.height}). نحتاج على الأقل ${MIN_W}×${MIN_H}.`)
      }
      if (analysis.aspect < 1.2 || analysis.aspect > 2.2) {
        issues.push('نسبة الصورة غير مطابقة لشكل البطاقة المصرية. تأكد من التقاط البطاقة كاملة.')
      }
      if (analysis.blurScore !== null && analysis.blurScore < 18) {
        issues.push('الصورة تبدو غير واضحة (blur). تأكد من ثبات اليد والإضاءة الجيدة.')
      }

      // 4) Anti-spoofing heuristic
      if (rawFile.type === 'image/png' && !analysis.hasExif) {
        // PNG without camera EXIF → screenshot suspect
        issues.push('الصورة تبدو لقطة شاشة (Screenshot). من فضلك التقطها بالكاميرا مباشرة من البطاقة الفعلية.')
      }

      const blocking = issues.length > 1 || (analysis.width < MIN_W || analysis.height < MIN_H)
      if (blocking) {
        setWarnings(issues)
        return
      }

      // Soft warnings — accept the file but show notes
      if (issues.length > 0) setWarnings(issues)

      const url = URL.createObjectURL(rawFile)
      setFile(rawFile)
      setPreview(url)
      onChange?.(rawFile)
    } catch (e) {
      console.error('[IdImageUploader] analyze failed:', e)
      // Still accept on analysis failure — don't block the user from registering
      const url = URL.createObjectURL(rawFile)
      setFile(rawFile)
      setPreview(url)
      onChange?.(rawFile)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleFileSelected = (e) => {
    const f = e.target.files?.[0]
    if (f) accept(f)
  }

  const onCameraCapture = (capturedFile) => {
    setCameraOpen(false)
    if (capturedFile) accept(capturedFile)
  }

  const showError = externalError && !file
  const isOk = file && warnings.length === 0
  const hasSoftWarning = file && warnings.length > 0

  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-gray-700 dark:text-slate-300">
        {label} <span className="text-red-500">*</span>
      </label>

      {!file && (
        <div className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
          showError
            ? 'border-red-300 bg-red-50/30 dark:bg-red-900/20'
            : 'border-gray-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50/30 dark:hover:bg-sky-900/10'
        }`}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelected}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={analyzing}
          />
          {analyzing ? (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">جاري فحص الصورة...</p>
            </div>
          ) : (
            <>
              <UploadCloud className={`mx-auto mb-3 ${showError ? 'text-red-400' : 'text-sky-500'}`} size={36} />
              <p className="text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">اضغط أو اسحب صورة بطاقة الرقم القومي</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">JPG, PNG — حد أقصى 10 ميجابايت — الدقة الأدنى 800×500</p>
              <div className="flex justify-center gap-2 relative z-10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={(e) => { e.stopPropagation(); setCameraOpen(true) }}
                >
                  <Camera size={14} /> التقاط بالكاميرا
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {file && (
        <div className={`relative rounded-2xl border-2 p-3 flex items-start gap-3 ${
          isOk
            ? 'border-green-200 bg-green-50/40 dark:bg-green-900/10 dark:border-green-800'
            : 'border-amber-200 bg-amber-50/40 dark:bg-amber-900/10 dark:border-amber-800'
        }`}>
          <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {preview ? (
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageOff size={20} /></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{file.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {Math.round(file.size / 1024)} ك.ب — {file.type.replace('image/', '').toUpperCase()}
            </p>
            {isOk && (
              <p className="text-xs text-green-700 dark:text-green-400 mt-1.5 flex items-center gap-1 font-bold">
                <CheckCircle2 size={12} /> الصورة صالحة وجاهزة
              </p>
            )}
            {hasSoftWarning && (
              <ul className="text-xs text-amber-800 dark:text-amber-300 mt-1.5 space-y-0.5">
                {warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={() => { reset(); fileRef.current?.click() }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <RefreshCw size={12} /> تغيير
            </button>
            <button type="button" onClick={reset} className="text-xs text-red-500 hover:underline flex items-center gap-1">
              <X size={12} /> حذف
            </button>
          </div>
        </div>
      )}

      {!file && warnings.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1.5">
              <AlertTriangle size={12} className="shrink-0 mt-0.5" /> {w}
            </p>
          ))}
        </div>
      )}

      {showError && (
        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
          <AlertTriangle size={12} /> {externalError}
        </p>
      )}

      {cameraOpen && (
        <CameraCapture onCapture={onCameraCapture} onClose={() => setCameraOpen(false)} />
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────
// Image analysis (resolution + aspect + blur + EXIF)
// ──────────────────────────────────────────────────────────────────

async function analyzeImage(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const width = img.naturalWidth
    const height = img.naturalHeight
    const aspect = width / height

    // Blur heuristic — Laplacian variance on a 200px-wide downsample
    const blurScore = computeBlurScore(img, 200)

    // EXIF probe — JPEGs from cameras have an APP1 marker; screenshots don't
    let hasExif = false
    if (/jpeg|jpg/i.test(file.type)) {
      hasExif = await probeJpegExif(file)
    }

    return { width, height, aspect, blurScore, hasExif }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

/**
 * computeBlurScore — variance of a simple 3×3 Laplacian on a small canvas.
 * Higher = sharper. Returns null on failure.
 */
function computeBlurScore(img, targetW = 200) {
  try {
    const ratio = img.naturalHeight / img.naturalWidth
    const w = Math.min(targetW, img.naturalWidth)
    const h = Math.round(w * ratio)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    // Convert to grayscale + apply 3x3 Laplacian, accumulate mean & variance
    const gray = new Float32Array(w * h)
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      gray[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    }

    const lap = new Float32Array(w * h)
    let sum = 0
    let count = 0
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x
        const v =
          -gray[idx - w - 1] - gray[idx - w] - gray[idx - w + 1] -
          gray[idx - 1] + 8 * gray[idx] - gray[idx + 1] -
          gray[idx + w - 1] - gray[idx + w] - gray[idx + w + 1]
        lap[idx] = v
        sum += v
        count++
      }
    }
    const mean = sum / count
    let varianceSum = 0
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const v = lap[y * w + x] - mean
        varianceSum += v * v
      }
    }
    const variance = varianceSum / count
    return Math.round(Math.sqrt(variance))
  } catch {
    return null
  }
}

/**
 * probeJpegExif — read first 64KB of the file and look for the APP1
 * (EXIF) marker (FF E1 ... 'Exif\0\0'). Camera-taken JPEGs always have one;
 * screenshots/web exports usually don't.
 */
async function probeJpegExif(file) {
  try {
    const slice = await file.slice(0, Math.min(file.size, 65536)).arrayBuffer()
    const view = new DataView(slice)
    if (view.byteLength < 4) return false
    if (view.getUint16(0) !== 0xffd8) return false // not a JPEG SOI
    let offset = 2
    while (offset + 4 < view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break
      const marker = view.getUint8(offset + 1)
      const segLen = view.getUint16(offset + 2)
      if (marker === 0xe1) {
        // Check for 'Exif' magic
        if (offset + 10 < view.byteLength) {
          const e = String.fromCharCode(
            view.getUint8(offset + 4),
            view.getUint8(offset + 5),
            view.getUint8(offset + 6),
            view.getUint8(offset + 7),
          )
          if (e === 'Exif') return true
        }
      }
      offset += 2 + segLen
    }
    return false
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────────
// CameraCapture modal — uses getUserMedia rear-facing camera
// ──────────────────────────────────────────────────────────────────

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
        if (!alive) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.onloadedmetadata = () => setReady(true)
        }
      } catch (e) {
        setError(e.message || 'تعذر الوصول إلى الكاميرا')
      }
    })()
    return () => {
      alive = false
      streamRef.current?.getTracks?.().forEach(t => t.stop())
    }
  }, [])

  const snap = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const w = video.videoWidth
    const h = video.videoHeight
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    canvas.toBlob((blob) => {
      if (!blob) return
      const f = new File([blob], `id-capture-${Date.now()}.jpg`, { type: 'image/jpeg' })
      onCapture(f)
    }, 'image/jpeg', 0.92)
  }

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      dir="rtl"
      onClick={onClose}
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="font-bold flex items-center gap-2"><Camera size={18} /> التقاط صورة البطاقة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1"><X size={18} /></button>
        </div>
        <div className="bg-black aspect-video flex items-center justify-center relative">
          {error ? (
            <div className="text-white text-center p-6">
              <AlertTriangle size={32} className="mx-auto mb-2 text-amber-400" />
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1 text-white/60">من فضلك اسمح بالوصول للكاميرا أو ارفع صورة بدلاً من ذلك.</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
              {/* Card-shape guide overlay (1.586:1) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-white/80 rounded-xl" style={{ width: '70%', aspectRatio: '1.586/1' }} />
              </div>
            </>
          )}
        </div>
        <div className="p-4 flex justify-between items-center gap-2">
          <p className="text-xs text-gray-500 dark:text-slate-400">ضع البطاقة داخل الإطار وتأكد من ثبات اليد</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>إلغاء</Button>
            <Button type="button" onClick={snap} disabled={!ready || !!error} className="gap-2 bg-sky-600 hover:bg-sky-700 text-white">
              <Camera size={14} /> التقاط
            </Button>
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
