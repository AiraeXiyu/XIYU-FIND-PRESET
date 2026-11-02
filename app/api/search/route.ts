import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeVideo(value: any) {
  const item = value?.item ?? value;
  const author = item?.author ?? value?.author ?? {};
  const stats = item?.stats ?? value?.stats ?? {};
  const video = item?.video ?? value?.video ?? {};
  const id = String(item?.id ?? value?.id ?? "");
  const url = String(value?.url ?? item?.shareUrl ?? (id && author?.uniqueId ? `https://www.tiktok.com/@${author.uniqueId}/video/${id}` : ""));
  if (!id || !url.startsWith("https://www.tiktok.com/")) return null;
  return {
    id,
    url,
    description: String(item?.desc ?? value?.description ?? ""),
    author: String(author?.uniqueId ?? value?.author ?? ""),
    nickname: String(author?.nickname ?? value?.nickname ?? ""),
    cover: String(video?.cover ?? video?.originCover ?? value?.cover ?? ""),
    views: Number(stats?.playCount ?? value?.views ?? 0),
    likes: Number(stats?.diggCount ?? value?.likes ?? 0),
    comments: Number(stats?.commentCount ?? value?.comments ?? 0),
    music: String(item?.music?.title ?? value?.music ?? "")
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ ok: false, error: "Kata kunci harus 2–100 karakter." }, { status: 400 });
  }

  // Provider harus berupa layanan pencarian TikTok yang penggunaannya diizinkan.
  // Kontrak provider: GET {TIKTOK_SEARCH_API_URL}?q=<keyword>, optional Bearer key.
  const endpoint = process.env.TIKTOK_SEARCH_API_URL;
  if (!endpoint) {
    return NextResponse.json({
      ok: false,
      error: "Provider TikTok Search belum dikonfigurasi. Isi TIKTOK_SEARCH_API_URL dengan endpoint provider yang mengizinkan penggunaan data ini."
    }, { status: 503 });
  }

  try {
    const target = new URL(endpoint);
    target.searchParams.set("q", q);
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.TIKTOK_SEARCH_API_KEY) headers.Authorization = `Bearer ${process.env.TIKTOK_SEARCH_API_KEY}`;
    const upstream = await fetch(target, { headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!upstream.ok) return NextResponse.json({ ok: false, error: `Provider mengembalikan HTTP ${upstream.status}.` }, { status: 502 });
    const payload = await upstream.json();
    const raw = Array.isArray(payload) ? payload : payload.videos ?? payload.data ?? payload.results ?? [];
    const videos = raw.map(normalizeVideo).filter(Boolean).slice(0, 30);
    return NextResponse.json({ ok: true, videos });
  } catch {
    return NextResponse.json({ ok: false, error: "Tidak dapat menghubungi provider TikTok Search." }, { status: 502 });
  }
}
