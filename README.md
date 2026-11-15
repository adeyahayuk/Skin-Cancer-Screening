# Skrining Lesi Kulit

Aplikasi web skrining visual cepat lesi kulit: pengguna memotret atau mengunggah satu foto, lalu aplikasi menampilkan probabilitas kanker dan bukan kanker. Hanya alat bantu skrining awal, bukan pengganti diagnosis dokter.

## Struktur repo

```
skin-cancer-screening/
├── frontend/              React + Vite (dihosting di Vercel)
│   ├── src/
│   │   ├── App.jsx        layar kamera, unggah, hasil, dan THRESHOLD
│   │   └── api.js         pemanggilan backend (mock jika VITE_API_URL kosong)
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
├── backend/               Django REST API + model (dihosting terpisah)
│   ├── manage.py
│   ├── api/
│   │   ├── views.py       endpoint POST /api/predict
│   │   └── predictor.py   memuat .tflite dan inferensi
│   ├── models/
│   │   └── skin_model.tflite
│   └── requirements.txt
├── .gitignore
└── README.md
```

`node_modules/`, `dist/`, `.env`, dan dataset tidak di-commit.

## Menghubungkan frontend ke backend

Frontend dan backend berjalan di tempat berbeda dan hanya terhubung lewat satu URL.

Kontrak endpoint:

```
POST  {VITE_API_URL}
multipart/form-data, field "image" (JPEG 224x224)

Respons: { "probabilities": { "cancer": 0.82, "non_cancer": 0.18 } }
```

Langkah menyambungkan (setelah backend aktif di URL HTTPS):

1. Uji backend dulu: `curl -X POST -F "image=@contoh.jpg" https://URL-BACKEND/api/predict`
2. Di backend, aktifkan CORS untuk domain Vercel (`django-cors-headers`, `CORS_ALLOWED_ORIGINS`).
3. Di Vercel: **Settings → Environment Variables**, tambahkan `VITE_API_URL` berisi URL endpoint lengkap (centang Production).
4. **Deployments → ⋯ → Redeploy**. Variabel ditanam saat build, jadi redeploy wajib.
5. Buka aplikasi dan pastikan badge "Mode mock" sudah hilang.

Untuk lokal: salin `frontend/.env.example` menjadi `frontend/.env`, isi `VITE_API_URL`, lalu jalankan ulang `npm run dev`.

Catatan backend: normalisasi 1/255 dan urutan kelas harus sama dengan saat training, backend wajib HTTPS, dan gambar pengguna tidak boleh disimpan.

## Deploy frontend ke Vercel

1. Push repo ke GitHub.
2. Vercel: **Add New → Project**, pilih repo.
3. Atur **Root Directory** ke `frontend` (folder `backend/` tidak ikut).
4. Biarkan setelan lain default, klik **Deploy**.

Setiap push ke `main` men-deploy ulang otomatis. Sebelum backend siap, biarkan `VITE_API_URL` kosong: aplikasi berjalan dengan hasil mock (acak).

## Menjalankan di HP

Kamera browser butuh HTTPS, jadi cukup buka tautan Vercel (`https://nama-proyek.vercel.app`) di Chrome atau Safari, lalu pilih **Izinkan** saat diminta akses kamera. Jika kamera tidak bisa dipakai, gunakan tombol unggah dari galeri.

Untuk uji lokal di HP saat `npm run dev` berjalan, buka terminal kedua dan jalankan `cloudflared tunnel --url http://localhost:5173` (atau `npx localtunnel --port 5173`), lalu buka tautan HTTPS yang muncul.

Sebelum demo: bangunkan backend gratis beberapa menit sebelumnya (biasanya tidur saat sepi), dan coba satu alur lengkap di HP.
