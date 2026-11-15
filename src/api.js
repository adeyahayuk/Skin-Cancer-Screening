// Kontrak endpoint (sepakati dengan backend):
//   POST  VITE_API_URL
//   Body  multipart/form-data, field "image" (224x224 JPEG)
//   Resp  { "probabilities": { "cancer": 0.82, "non_cancer": 0.18 } }
const API_URL = import.meta.env.VITE_API_URL

export const USING_MOCK = !API_URL

export async function predict(blob) {
  if (USING_MOCK) {
    await new Promise((r) => setTimeout(r, 1500))
    const cancer = Math.random()
    return { cancer, non_cancer: 1 - cancer }
  }
  const body = new FormData()
  body.append('image', blob, 'lesion.jpg')
  const res = await fetch(API_URL, { method: 'POST', body })
  if (!res.ok) throw new Error(`Server mengembalikan status ${res.status}`)
  const data = await res.json()
  return data.probabilities
}
