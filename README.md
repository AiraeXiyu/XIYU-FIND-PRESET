# XIYU Find Preset

Next.js 15 application for discovering TikTok videos by keyword and submitting a selected video URL to the Find Preset scanner.

## Search Videos

The `GET /api/search?q=...` endpoint searches indexed public TikTok videos using a server-side search provider. The provider request is kept on the server; the browser only communicates with the XIYU endpoint.

The endpoint normalizes the results into one response format:

- `id`: video ID
- `url`: TikTok video URL
- `description`: video caption/description
- `author`: creator username
- `nickname`: creator display name
- `cover`: public thumbnail URL, when available
- `views`, `likes`, `comments`: video statistics
- `music`: music title, when available

Search returns up to 12 unique video candidates. Thumbnail lookup is best-effort: a missing thumbnail does not prevent a video from appearing in the results. Search relevance, result count, availability, and response time depend on the upstream search index and may change without notice.

No search-provider credentials or environment variables are currently required in `.env`.

## Search flow

1. Enter a song name or keyword in Search Preset.
2. The browser requests `/api/search?q=...` on this application.
3. Select a result and click **Cari Preset**.
4. The selected TikTok URL is passed directly to the existing `/api/find` route.

## API documentation

Open `/docs` or select **Document API** in the bottom navigation. The documentation includes the Base URL, request parameters, and response examples.

## Run locally

```bash
npm install
npm run dev
```

## Important status

Search discovers candidate videos only; it does not scan comments or replies. The selected video's URL is passed to `/api/find` for scanning. The existing `/api/find` route remains unchanged and continues forwarding its SSE request to the finder service already configured in the project. This revision does not make the scanner independent.

## Troubleshooting Search

- `400`: keyword is shorter than 2 characters or longer than 100 characters.
- `502`: the search service is unavailable, returns an unexpected response, or cannot be reached.
- Empty `cover`: thumbnail metadata was unavailable; the result itself can still be used.
- Irrelevant results: try a more specific keyword. Search relevance is determined by the upstream index and cannot be guaranteed by the UI.
