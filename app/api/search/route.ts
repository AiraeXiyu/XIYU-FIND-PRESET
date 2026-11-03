import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_ENDPOINT = "https://www.revid.ai/api/tiktok-search";
const TIKTOK_OEMBED_ENDPOINT = "https://www.tiktok.com/oembed";
const RESULT_LIMIT = 12;

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

type SearchResponse = {
  ok: boolean;
  keyword: string;
  count: number;
  videos: SearchVideo[];
  error?: string;
};

function json(body: SearchResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

function safeTikTokUrl(value: unknown): string {
  const candidate = text(value);
  if (!candidate) return "";

  try {
    const url = new URL(candidate);
    if (
      !/(^|\.)tiktok\.com$/i.test(url.hostname) ||
      !url.pathname.includes("/video/")
    ) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeVideo(item: any): SearchVideo | null {
  if (!item || typeof item !== "object") return null;

  const id = text(item.id ?? item._firestore_id);
  const url = safeTikTokUrl(item.url);
  const author = text(item.username);

  if (!id || !url) return null;

  return {
    id,
    url,
    description: text(item.desc ?? item.contentSummary ?? item.content),
    author,
    nickname: text(item.userNickname) || author || "TikTok creator",
    cover: "",
    views: number(item.playCount),
    likes: number(item.diggCount),
    comments: number(item.commentCount),
    music: text(item.music)
  };
}

async function getThumbnail(videoUrl: string): Promise<string> {
  try {
    const endpoint = new URL(TIKTOK_OEMBED_ENDPOINT);
    endpoint.searchParams.set("url", videoUrl);

    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(2500)
    });

    if (!response.ok) return "";
    const payload = await response.json();
    const thumbnail = text(payload?.thumbnail_url);

    if (!thumbnail) return "";
    const parsed = new URL(thumbnail);
    return parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

async function searchVideos(keyword: string): Promise<SearchVideo[]> {
  const response = await fetch(SEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: "https://www.revid.ai/tiktok-video-finder",
      Origin: "https://www.revid.ai",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    },
    body: JSON.stringify({
      keywords: keyword,
      filtersFast: [],
      extraParams: {}
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000)
  });

  if (!response.ok) {
    throw new Error("Layanan pencarian sedang tidak tersedia. Coba lagi nanti.");
  }

  const payload: any = await response.json();
  if (!payload || !Array.isArray(payload.videos)) {
    throw new Error("Respons pencarian tidak sesuai format.");
  }

  const normalized = payload.videos
    .map(normalizeVideo)
    .filter((video: SearchVideo | null): video is SearchVideo => Boolean(video));

  const unique = Array.from(
    new Map<string, SearchVideo>(normalized.map((video: SearchVideo) => [video.id, video] as const)).values()
  ).slice(0, RESULT_LIMIT);

  // Thumbnail diambil dari metadata publik TikTok; kegagalan thumbnail tidak
  // menggagalkan hasil pencarian.
  return Promise.all(unique.map(async (video: SearchVideo) => ({
    ...video,
    cover: await getThumbnail(video.url)
  })));
}

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (keyword.length < 2) {
    return json({
      ok: false,
      keyword,
      count: 0,
      videos: [],
      error: "Masukkan minimal 2 karakter."
    }, 400);
  }

  if (keyword.length > 100) {
    return json({
      ok: false,
      keyword,
      count: 0,
      videos: [],
      error: "Kata kunci maksimal 100 karakter."
    }, 400);
  }

  try {
    const videos = await searchVideos(keyword);
    return json({
      ok: true,
      keyword,
      count: videos.length,
      videos
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Pencarian video gagal. Coba lagi nanti.";

    return json({
      ok: false,
      keyword,
      count: 0,
      videos: [],
      error: message
    }, 502);
  }
}
