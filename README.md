# XIYU Find Preset

Next.js 15 application for searching TikTok videos and submitting a selected video URL to the existing Find Preset scanner.

## TikTok Search configuration

The Search endpoint uses the `tiktok-search-api` source supplied for this project. It calls TikTok's search endpoint from the server and normalizes the returned video items.

Add this Environment Variable in Vercel:

```env
TIKTOK_TTWID=your_ttwid_value
```

Enter only the cookie value, without `ttwid=` and without a semicolon. Keep it server-side; never expose it in frontend code or commit it to Git. Do not use or share a personal authenticated session cookie. TikTok may change or restrict this undocumented endpoint, so availability is not guaranteed.

## Search flow

1. Enter a song name or keyword in Search Preset.
2. `/api/search?q=...` returns candidate TikTok videos.
3. Select a video and click **Cari Preset**.
4. The selected video's URL is submitted to the same `/api/find` route used by manual URL input.

## API documentation

Open `/docs` or select **Document API** in the bottom navigation. It documents the current `/api/search` and `/api/find` routes.

## Run locally

```bash
npm install
npm run dev
```

## Important status

The Search route is integrated with the supplied TikTok Search source, but depends on a valid `TIKTOK_TTWID` value and TikTok's continued availability of its undocumented search endpoint. The original `/api/find` route remains the scanner implementation from the supplied XIYU project; this revision does not claim to replace its upstream scanner.
