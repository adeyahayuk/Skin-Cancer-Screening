import { useEffect, useRef, useState } from 'react'
import { predict, USING_MOCK } from './api'

const SIZE = 224 // ukuran masukan ResNet-50
// Ambang "perlu diperiksa". Dibuat < 0.5 agar condong ke sensitivitas
// (menekan false negative). Sesuaikan setelah model selesai dievaluasi.
const THRESHOLD = 0.3

const DISCLAIMER =
  'Aplikasi ini hanya alat bantu skrining awal, bukan pengganti diagnosis dokter.'

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

// ---------- Layar awal ----------
function Home({ onCamera, onUpload }) {
  const fileRef = useRef(null)
  return (
    <main className="screen center">
      <h1>Skrining Lesi Kulit</h1>
      <p className="lead">
        Foto lesi kulit satu kali, tanpa mengisi formulir. Hasilnya berupa
        perkiraan awal apakah lesi perlu diperiksa dokter.
      </p>
      <button className="btn primary" onClick={onCamera}>Buka kamera</button>
      <button className="btn" onClick={() => fileRef.current.click()}>
        Unggah foto dari galeri
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files[0]) onUpload(e.target.files[0])
          e.target.value = ''
        }}
      />
      <p className="note">{DISCLAIMER}</p>
      {USING_MOCK && <p className="badge">Mode mock: hasil masih acak</p>}
    </main>
  )
}

// ---------- Layar kamera ----------
function Camera({ onCapture, onBack, onUpload }) {
  const videoRef = useRef(null)
  const boxRef = useRef(null)
  const fileRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let stream
    let cancelled = false
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Peramban tidak mendukung kamera, atau halaman tidak memakai HTTPS.')
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) return stream.getTracks().forEach((t) => t.stop())
        videoRef.current.srcObject = stream
      } catch (e) {
        setError(e.message || 'Kamera tidak dapat diakses.')
      }
    }
    start()
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function shoot() {
    const video = videoRef.current
    const box = boxRef.current.getBoundingClientRect()
    const area = video.getBoundingClientRect()
    if (!video.videoWidth) return
    // Video tampil dengan object-fit: cover, jadi petakan posisi kotak ke piksel video.
    const scale = Math.max(area.width / video.videoWidth, area.height / video.videoHeight)
    const offX = (video.videoWidth * scale - area.width) / 2
    const offY = (video.videoHeight * scale - area.height) / 2
    const sx = (box.left - area.left + offX) / scale
    const sy = (box.top - area.top + offY) / scale
    const sSize = box.width / scale

    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    canvas.getContext('2d').drawImage(video, sx, sy, sSize, sSize, 0, 0, SIZE, SIZE)
    onCapture(await canvasToBlob(canvas))
  }

  return (
    <main className="screen camera">
      <div className="viewfinder">
        <video ref={videoRef} autoPlay playsInline muted />
        <div className="mask">
          <div ref={boxRef} className="box" style={{ width: SIZE, height: SIZE }} />
        </div>
        {error && (
          <div className="cam-error">
            <p>{error}</p>
            <button className="btn" onClick={() => fileRef.current.click()}>
              Unggah foto sebagai gantinya
            </button>
          </div>
        )}
      </div>
      <ul className="tips">
        <li>Pastikan area lesi bersih dari rambut</li>
        <li>Hindari pantulan cahaya atau lampu kilat</li>
        <li>Gunakan pencahayaan yang cukup, letakkan lesi di dalam kotak</li>
      </ul>
      <div className="bar">
        <button className="btn" onClick={onBack}>Kembali</button>
        <button className="shutter" onClick={shoot} aria-label="Ambil foto" disabled={!!error} />
        <button className="btn" onClick={() => fileRef.current.click()}>Galeri</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])}
      />
    </main>
  )
}

// ---------- Konfirmasi ----------
function Preview({ url, loading, error, onRetake, onAnalyze }) {
  return (
    <main className="screen center">
      <h2>Periksa foto</h2>
      <img className="thumb" src={url} alt="Hasil potongan 224 x 224" />
      <p className="note">
        Pastikan lesi terlihat jelas, tidak buram, dan tanpa rambut atau pantulan cahaya.
      </p>
      {error && <p className="error">Gagal menganalisis: {error}</p>}
      <button className="btn primary" onClick={onAnalyze} disabled={loading}>
        {loading ? 'Menganalisis…' : error ? 'Coba lagi' : 'Analisis'}
      </button>
      <button className="btn" onClick={onRetake} disabled={loading}>Foto ulang</button>
    </main>
  )
}

// ---------- Hasil ----------
function Result({ url, probs, onReset }) {
  const flagged = probs.cancer >= THRESHOLD
  const pct = (v) => `${(v * 100).toFixed(1)}%`
  return (
    <main className="screen center">
      <img className="thumb small" src={url} alt="Foto yang dianalisis" />
      <div className={`verdict ${flagged ? 'warn' : 'ok'}`}>
        <h2>{flagged ? 'Disarankan diperiksa dokter' : 'Risiko terlihat rendah'}</h2>
        <p>
          {flagged
            ? 'Model menemukan ciri yang mirip lesi kanker. Segera konsultasikan ke dokter atau fasilitas kesehatan.'
            : 'Hasil ini bukan jaminan. Jika lesi berubah bentuk, warna, atau ukuran, tetap periksakan ke dokter.'}
        </p>
      </div>
      <div className="bars">
        <div className="row"><span>Kanker</span><span>{pct(probs.cancer)}</span></div>
        <div className="track"><div className="fill cancer" style={{ width: pct(probs.cancer) }} /></div>
        <div className="row"><span>Bukan kanker</span><span>{pct(probs.non_cancer)}</span></div>
        <div className="track"><div className="fill safe" style={{ width: pct(probs.non_cancer) }} /></div>
      </div>
      <p className="note">{DISCLAIMER}</p>
      <button className="btn primary" onClick={onReset}>Skrining lagi</button>
    </main>
  )
}

// ---------- Aplikasi ----------
export default function App() {
  const [step, setStep] = useState('home') // home | camera | preview | result
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState('')
  const [probs, setProbs] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  function setImage(b) {
    setBlob(b)
    setUrl(URL.createObjectURL(b))
    setError('')
    setStep('preview')
  }

  // Foto unggahan: dipotong persegi di tengah lalu diperkecil ke 224 x 224
  async function handleUpload(file) {
    try {
      const bmp = await createImageBitmap(file)
      const side = Math.min(bmp.width, bmp.height)
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = SIZE
      canvas
        .getContext('2d')
        .drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
      setImage(await canvasToBlob(canvas))
    } catch {
      alert('Berkas tidak dapat dibaca sebagai gambar.')
    }
  }

  async function analyze() {
    setLoading(true)
    setError('')
    try {
      setProbs(await predict(blob))
      setStep('result')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'camera')
    return <Camera onCapture={setImage} onUpload={handleUpload} onBack={() => setStep('home')} />
  if (step === 'preview')
    return (
      <Preview url={url} loading={loading} error={error}
        onRetake={() => setStep('home')} onAnalyze={analyze} />
    )
  if (step === 'result')
    return <Result url={url} probs={probs} onReset={() => setStep('home')} />
  return <Home onCamera={() => setStep('camera')} onUpload={handleUpload} />
}
