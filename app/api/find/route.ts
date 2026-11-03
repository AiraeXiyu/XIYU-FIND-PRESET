import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FIND_SERVICE_URL = process.env.FIND_API_URL?.trim();

function validTikTokUrl(value: string) {
  try {
    const url = new URL(value);

    return (
      /(^|\.)tiktok\.com$/i.test(url.hostname) ||
      /(^|\.)vt\.tiktok\.com$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("url")?.trim();

  if (!input) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "TikTok link is required."
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  if (!validTikTokUrl(input)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Please enter a valid TikTok link."
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }

  if (!FIND_SERVICE_URL) {
    return new Response(JSON.stringify({ ok: false, error: "Find service is not configured. Set FIND_API_URL." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(FIND_SERVICE_URL);
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "FIND_API_URL must be a valid URL." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  upstreamUrl.searchParams.set("url", input);

  const bat = request.nextUrl.searchParams.get("bat");
  const chg = request.nextUrl.searchParams.get("chg");

  if (bat) upstreamUrl.searchParams.set("bat", bat);
  if (chg) upstreamUrl.searchParams.set("chg", chg);

  try {
    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        Accept: "text/event-stream"
      },
      cache: "no-store"
    });

    if (!response.ok || !response.body) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Finder service returned HTTP ${response.status}.`
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no"
      }
    });
  } catch {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Unable to connect to the finder service."
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
}
