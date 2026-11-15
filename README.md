# Skrining Lesi Kulit (Frontend)

## Menjalankan
    npm install
    npm run dev          # buka http://localhost:5173

## Uji di HP (kamera butuh HTTPS)
    cloudflared tunnel --url http://localhost:5173   # atau: ngrok http 5173
Buka tautan https yang muncul di HP.

## Menyambung ke backend
    cp .env.example .env      # isi VITE_API_URL dengan URL endpoint Django
Kosongkan VITE_API_URL untuk memakai mock (hasil acak).
Backend harus mengizinkan CORS dari domain frontend dan memakai HTTPS.

## Build & deploy
    npm run build            # hasil di dist/ (Vercel/Netlify: set VITE_API_URL di pengaturan env)
