```ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchVideo = {
  id: string;
  url: string;
  description: string;
  author: string;
  nickname: string;
  cover: string;
  views: number;
  likes: number;
  comments: number;
  music: string;
};

type SearchProviderResult = {
  ok: boolean;
  videos: SearchVideo[];
  error?: string;
};

const JSON_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8"
};

function response(
  body: SearchProviderResult,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: JSON_HEADERS
  });
}

function cleanText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

function cleanNumber(value: unknown): number {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return number;
}

/**
 * Normalisasi hasil video.
 *
 * Fungsi ini hanya menerima data video publik
 * yang diberikan oleh sumber pencarian.
 */
function normalizeVideo(value: any): SearchVideo | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const item = value.item ?? value;
  const author = item.author ?? {};
  const stats = item.stats ?? {};
  const video = item.video ?? {};
  const music = item.music ?? {};

  const id = cleanText(
    item.id ?? value.id ?? value.aweme_id
  );

  const username = cleanText(
    author.uniqueId ??
    author.unique_id ??
    value.author
  );

  if (!id || !username) {
    return null;
  }

  const cover = cleanText(
    video.cover ??
    video.originCover ??
    video.origin_cover ??
    value.cover
  );

  return {
    id,
    url: `https://www.tiktok.com/@${encodeURIComponent(
      username
    )}/video/${encodeURIComponent(id)}`,
    description: cleanText(
      item.desc ?? value.description
    ),
    author: username,
    nickname:
      cleanText(author.nickname ?? value.nickname) ||
      username,
    cover,
    views: cleanNumber(
      stats.playCount ?? stats.play_count ?? value.views
    ),
    likes: cleanNumber(
      stats.diggCount ?? stats.digg_count ?? value.likes
    ),
    comments: cleanNumber(
      stats.commentCount ??
      stats.comment_count ??
      value.comments
    ),
    music: cleanText(
      music.title ?? value.music
    )
  };
}

/**
 * Mengambil video dari provider pencarian yang
 * memang menyediakan akses resmi/diizinkan.
 *
 * Konfigurasi:
 *
 * TIKTOK_SEARCH_API_URL
 *
 * Provider harus menerima query melalui parameter q
 * dan mengembalikan JSON:
 *
 * {
 *   "videos": [
 *     {
 *       "id": "...",
 *       "url": "...",
 *       "description": "...",
 *       "author": "...",
 *       "nickname": "...",
 *       "cover": "...",
 *       "views": 1000,
 *       "likes": 100,
 *       "comments": 10,
 *       "music": "..."
 *     }
 *   ]
 * }
 */
async function searchProvider(
  keyword: string
): Promise<SearchVideo[]> {
  const providerUrl = process.env.TIKTOK_SEARCH_API_URL;

  if (!providerUrl) {
    throw new Error(
      "Sumber pencarian belum dikonfigurasi. Atur TIKTOK_SEARCH_API_URL menggunakan provider pencarian yang memiliki akses resmi."
    );
  }

  let endpoint: URL;

  try {
    endpoint = new URL(providerUrl);
  } catch {
    throw new Error(
      "TIKTOK_SEARCH_API_URL bukan URL yang valid."
    );
  }

  if (endpoint.protocol !== "https:") {
    throw new Error(
      "Provider pencarian harus menggunakan HTTPS."
    );
  }

  endpoint.searchParams.set("q", keyword);

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    15000
  );

  try {
    const upstream = await fetch(endpoint, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!upstream.ok) {
      throw new Error(
        `Provider pencarian membalas HTTP ${upstream.status}.`
      );
    }

    const contentType =
      upstream.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().includes("json")) {
      throw new Error(
        "Provider pencarian tidak mengembalikan JSON."
      );
    }

    const payload = await upstream.json();

    if (!payload || typeof payload !== "object") {
      throw new Error(
        "Format respons provider tidak valid."
      );
    }

    if (payload.ok === false) {
      throw new Error(
        cleanText(payload.error) ||
        "Provider gagal melakukan pencarian."
      );
    }

    const rawVideos = Array.isArray(payload.videos)
      ? payload.videos
      : Array.isArray(payload.data)
        ? payload.data
        : [];

    const seen = new Set<string>();
    const videos: SearchVideo[] = [];

    for (const raw of rawVideos) {
      const video = normalizeVideo(raw);

      if (!video || seen.has(video.id)) {
        continue;
      }

      seen.add(video.id);
      videos.push(video);

      if (videos.length >= 36) {
        break;
      }
    }

    return videos;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "Provider pencarian melewati batas waktu 15 detik."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const keyword =
    request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (keyword.length < 2) {
    return response(
      {
        ok: false,
        videos: [],
        error: "Masukkan minimal 2 karakter."
      },
      400
    );
  }

  if (keyword.length > 100) {
    return response(
      {
        ok: false,
        videos: [],
        error: "Kata kunci maksimal 100 karakter."
      },
      400
    );
  }

  try {
    const videos = await searchProvider(keyword);

    return response({
      ok: true,
      videos
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Pencarian video gagal.";

    return response(
      {
        ok: false,
        videos: [],
        error: message
      },
      502
    );
  }
}
```
