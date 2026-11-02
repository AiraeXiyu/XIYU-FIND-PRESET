# XIYU Find Preset

Next.js 15 application for searching TikTok videos and submitting a selected video URL to the existing Find Preset scanner.

## TikTok Search

The `/api/search` route follows the request flow from the supplied `tiktok-search-api` source. It attempts to obtain a public visitor `ttwid` cookie automatically by requesting the TikTok homepage. No manual `TIKTOK_TTWID` environment variable or personal login cookie is required.

TikTok's web search endpoint is undocumented and may change, rate-limit, or reject automated requests. Automatic visitor-cookie retrieval is best-effort; it is not a guarantee that TikTok will return search results in every Vercel region or deployment.

## Search flow

1. Enter a song name or keyword in Search Preset.
2. `/api/search?q=...` returns candidate TikTok videos.
3. Select a video and click **Cari Preset**.
4. The selected video's URL is submitted to the same `/api/find` route used by manual URL input.

## API documentation

Open `/docs` or select **Document API** in the bottom navigation. The Base URL in the documentation is set to `https://xiyu-find-preset.vercel.app`.

## Run locally

```bash
npm install
npm run dev
```

## Important status

Search only discovers candidate videos; it does not scan comments or replies. The selected video's URL is passed to `/api/find` for scanning. The original `/api/find` route still forwards its SSE request to the upstream finder configured in the source project; this revision does not claim that scanner is fully independent or that YouTube URLs are supported by the current route.


## Troubleshooting Search

The search route validates the TikTok response before parsing it. Empty responses, HTML challenge pages, non-JSON bodies, and changed response shapes now return a readable error instead of `Unexpected end of JSON input`. This improves error handling but cannot prevent TikTok from rate-limiting or blocking automated requests.


### Diagnostik Search TikTok
Jika `/api/search` gagal, respons API sekarang menyertakan `code` dan `stage` (misalnya `ambil_visitor_cookie` atau `pencarian_tiktok`). Pesan ini membantu membedakan kegagalan pengambilan visitor cookie dari respons endpoint pencarian TikTok. Cookie visitor tidak ditampilkan ke browser. Jika tahap `pencarian_tiktok` menyebut body kosong, berarti endpoint TikTok tidak mengirim isi respons; aplikasi tidak dapat memperbaiki respons upstream tersebut hanya dengan mengubah parsing JSON.
