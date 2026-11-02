# XIYU FIND PRESET

## Fitur
- Find Preset melalui link video TikTok (scanner yang sudah ada di `/api/find`).
- Search Preset berdasarkan kata kunci TikTok.
- Setiap hasil pencarian memiliki tombol **Cari Preset** yang meneruskan URL video terpilih ke scanner `/api/find` yang sama.

## TikTok Search provider
Source `tiktok-search-api-main` yang disertakan sebagai referensi menggunakan endpoint internal TikTok dan membutuhkan cookie `ttwid`. Karena cookie tersebut merupakan token sesi dan endpoint itu bukan API publik terdokumentasi, source tersebut tidak dipakai untuk mengumpulkan data di server XIYU.

Isi Environment Variables Vercel:
- `TIKTOK_SEARCH_API_URL`: endpoint provider pencarian TikTok yang penggunaannya diizinkan.
- `TIKTOK_SEARCH_API_KEY`: opsional, dikirim sebagai Bearer token.

Kontrak provider: `GET <TIKTOK_SEARCH_API_URL>?q=<keyword>` dengan JSON berisi `videos`, `data`, `results`, atau array langsung. Setiap video perlu memiliki `id`, `url`, dan data opsional `description`, `author`, `nickname`, `cover`, `views`, `likes`, `comments`, `music`.

## Jalankan
```bash
npm install
npm run dev
```

## Catatan
`/api/search` akan mengembalikan HTTP 503 sampai provider dikonfigurasi. Endpoint `/api/find` pada source asli masih mengarah ke server AM Finder; scanner mandiri belum tersedia pada source yang diberikan.

## Document API

Halaman dokumentasi API tersedia di `/docs` dan dapat dibuka dari ikon menu di header. Dokumentasi memuat base URL contoh, endpoint `GET /api/search`, endpoint `GET /api/find`, parameter, contoh request/response, tombol salin per bagian, dan tombol **Copy All Document**.

Catatan: `GET /api/search` memerlukan `TIKTOK_SEARCH_API_URL` dan opsional `TIKTOK_SEARCH_API_KEY`. `GET /api/find` pada source saat ini masih meneruskan Server-Sent Events ke layanan upstream AM Finder; halaman dokumentasi menyatakan ketergantungan ini secara eksplisit agar tidak memberi kesan bahwa scanner sudah mandiri.
