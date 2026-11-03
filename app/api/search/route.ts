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

const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8"
};

function json(
  body: {
    ok: boolean;
    videos: SearchVideo[];
    error?: string;
  },
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: HEADERS
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function normalizeVideo(item: any): SearchVideo | null {
  if (!item || typeof item !== "object") return null;

  const author = item.author ?? {};
  const stats = item.stats ?? {};
  const video = item.video ?? {};
  const music = item.music ?? {};

  const id = text(item.id ?? item.aweme_id);
  const username = text(author.uniqueId ?? author.unique_id);

  if (!id || !username) return null;

  const cover = text(
    video.cover ??
    video.originCover ??
    video.origin_cover
  );

  return {
    id,
    url: `https://www.tiktok.com/@${encodeURIComponent(username)}/video/${encodeURIComponent(id)}`,
    description: text(item.desc),
    author: username,
    nickname: text(author.nickname) || username,
    cover,
    views: number(stats.playCount ?? stats.play_count),
    likes: number(stats.diggCount ?? stats.digg_count),
    comments: number(stats.commentCount ?? stats.comment_count),
    music: text(music.title)
  };
}

async function fetchTikTok(
  url: string,
  cookie = ""
): Promise<Response> {
  return fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: "https://www.tiktok.com/",
      ...(cookie ? { Cookie: cookie } : {})
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000)
  });
}

async function searchTikTok(keyword: string): Promise<SearchVideo[]> {
  // Ambil cookie pengunjung biasa dari halaman utama.
  const home = await fetchTikTok("https://www.tiktok.com/");

  if (!home.ok) {
    throw new Error(
      `TikTok tidak bisa diakses (HTTP ${home.status}).`
    );
  }

  const cookies =
    (home.headers as any).getSetCookie?.() ?? [];

  const ttwid = cookies
    .map((cookie: string) => cookie.split(";")[0])
    .find((cookie: string) => cookie.startsWith("ttwid="));

  const params = new URLSearchParams({
    from_page: "search",
    keyword,
    offset: "0",
    search_source: "normal_search",
    web_search_code: "",
    count: "30",
    is_filter_search: "0",
    tz_name: "Asia/Jakarta",
    device_platform: "web",
    aid: "1988"
  });

  const endpoint =
    `https://www.tiktok.com/api/search/general/full/?${params}`;

  const upstream = await fetchTikTok(
    endpoint,
    ttwid ?? ""
  );

  if (!upstream.ok) {
    throw new Error(
      `Pencarian TikTok ditolak (HTTP ${upstream.status}).`
    );
  }

  const contentType =
    upstream.headers.get("content-type") ?? "";

  if (!contentType.includes("json")) {
    throw new Error(
      "TikTok tidak mengembalikan data pencarian JSON."
    );
  }

  const payload: any = await upstream.json();

  if (payload.status_code && payload.status_code !== 0) {
    throw new Error(
      text(payload.status_msg) ||
      "TikTok gagal memproses pencarian."
    );
  }

  const rawItems = Array.isArray(payload.data)
    ? payload.data
    : [];

  const videos: SearchVideo[] = [];
  const seen = new Set<string>();

  for (const entry of rawItems) {
    const item =
      entry?.item ??
      entry?.item_info?.item ??
      entry?.aweme_info;

    const video = normalizeVideo(item);

    if (!video || seen.has(video.id)) continue;

    seen.add(video.id);
    videos.push(video);

    if (videos.length >= 30) break;
  }

  return videos;
}

export async function GET(request: NextRequest) {
  const keyword =
    request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (keyword.length < 2) {
    return json({
      ok: false,
      videos: [],
      error: "Masukkan minimal 2 karakter."
    }, 400);
  }

  if (keyword.length > 100) {
    return json({
      ok: false,
      videos: [],
      error: "Kata kunci maksimal 100 karakter."
    }, 400);
  }

  try {
    const videos = await searchTikTok(keyword);

    return json({
      ok: true,
      videos
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Pencarian video gagal.";

    return json({
      ok: false,
      videos: [],
      error: message
    }, 502);
  }
}
