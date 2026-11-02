import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TikTokItem = {
  item?: { id?: string; desc?: string; author?: any; stats?: any; video?: any; music?: any };
  common?: { doc_id_str?: string };
};

function normalizeVideo(value: TikTokItem) {
  const item = value?.item ?? {};
  const author = item.author ?? {};
  const stats = item.stats ?? {};
  const video = item.video ?? {};
  const id = String(item.id ?? value?.common?.doc_id_str ?? "");
  const username = String(author.uniqueId ?? "");
  if (!id || !username) return null;
  return {
    id,
    url: `https://www.tiktok.com/@${encodeURIComponent(username)}/video/${id}`,
    description: String(item.desc ?? ""),
    author: username,
    nickname: String(author.nickname ?? username),
    cover: String(video.cover ?? video.originCover ?? ""),
    views: Number(stats.playCount ?? 0),
    likes: Number(stats.diggCount ?? 0),
    comments: Number(stats.commentCount ?? 0),
    music: String(item.music?.title ?? "")
  };
}

async function getGuestTtwid(): Promise<string> {
  // Ambil visitor cookie publik dari halaman TikTok; tidak memakai cookie login akun.
  const response = await fetch("https://www.tiktok.com/", {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    },
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(10000)
  });

  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const cookieLines = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie") ?? ""];
  const match = cookieLines.join("; ").match(/(?:^|[,;]\s*)ttwid=([^;]+)/i);
  if (!match?.[1]) throw new Error("TikTok tidak memberikan visitor cookie untuk pencarian otomatis. Coba lagi nanti.");
  return decodeURIComponent(match[1]);
}

async function requestSearch(keyword: string, ttwid: string, offset?: number, searchId?: string) {
  const url = new URL("https://www.tiktok.com/api/search/general/full/");
  url.searchParams.set("from_page", "search");
  url.searchParams.set("keyword", keyword);
  if (typeof offset === "number") url.searchParams.set("offset", String(offset));
  if (searchId) url.searchParams.set("search_id", searchId);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      Cookie: `ttwid=${ttwid};`,
      Referer: `https://www.tiktok.com/search?q=${encodeURIComponent(keyword)}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36"
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`TikTok mengembalikan HTTP ${response.status}. Pencarian mungkin sedang dibatasi.`);
  }
  if (!raw.trim()) {
    throw new Error("TikTok mengirim respons kosong. Coba lagi beberapa saat lagi.");
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    const looksLikeHtml = /<\s*(html|!doctype)/i.test(raw.slice(0, 500));
    throw new Error(looksLikeHtml
      ? "TikTok mengirim halaman web, bukan data pencarian. Akses pencarian otomatis sedang dibatasi."
      : "Respons TikTok bukan JSON yang valid. Coba lagi nanti.");
  }

  if (payload?.status_code && payload.status_code !== 0) {
    throw new Error(`TikTok menolak pencarian (kode ${payload.status_code}). Coba lagi nanti.`);
  }
  if (!Array.isArray(payload?.data)) {
    throw new Error("Format respons TikTok berubah atau tidak dikenali.");
  }
  return payload.data as TikTokItem[];
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) {
    return NextResponse.json({ ok: false, error: "Kata kunci harus 2–100 karakter." }, { status: 400 });
  }
  try {
    const ttwid = await getGuestTtwid();
    const firstPage = await requestSearch(q, ttwid);
    const firstCommon = firstPage.find((entry) => entry?.common?.doc_id_str)?.common?.doc_id_str;
    const all = [...firstPage];
    // Ambil dua halaman tambahan dengan pola offset/search_id dari source TikTok Search yang diberikan.
    if (firstCommon) {
      for (const offset of [24, 36]) {
        try {
          const next = await requestSearch(q, ttwid, offset, firstCommon);
          if (!next.length) break;
          all.push(...next);
        } catch { break; }
      }
    }
    const seen = new Set<string>();
    const videos = all.map(normalizeVideo).filter((video): video is NonNullable<ReturnType<typeof normalizeVideo>> => {
      if (!video || seen.has(video.id)) return false;
      seen.add(video.id);
      return true;
    }).slice(0, 36);
    return NextResponse.json({ ok: true, keyword: q, count: videos.length, videos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pencarian TikTok gagal.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
