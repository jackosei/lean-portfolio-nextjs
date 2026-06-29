import type { NextRequest } from "next/server";

export const runtime = "nodejs";

// Default to the access key that shipped with the original site; override via env.
const ACCESS_KEY = process.env.SCREENSHOTONE_ACCESS_KEY || "REDACTED";

/**
 * Proxies screenshot previews so the screenshotone access key never reaches the
 * browser. The card <img> points at /api/thumb?url=<project-url>.
 */
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target || !/^https?:\/\//i.test(target)) {
    return new Response("Invalid url", { status: 400 });
  }

  const shot = new URL("https://api.screenshotone.com/take");
  shot.searchParams.set("access_key", ACCESS_KEY);
  shot.searchParams.set("url", target);
  shot.searchParams.set("viewport_width", "1280");
  shot.searchParams.set("viewport_height", "800");
  shot.searchParams.set("format", "webp");
  shot.searchParams.set("image_quality", "80");
  shot.searchParams.set("cache", "true");
  shot.searchParams.set("full_page", "false");
  shot.searchParams.set("block_ads", "true");

  try {
    const upstream = await fetch(shot, { next: { revalidate: 604800 } });
    if (!upstream.ok || !upstream.body) {
      return new Response("Preview unavailable", { status: 502 });
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/webp",
        "Cache-Control":
          "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new Response("Preview unavailable", { status: 502 });
  }
}
