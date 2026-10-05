import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENAI_ARTIFACTS_URL = "https://api.openai.com/v1/agents/sessions";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string; artifactId: string }> },
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OpenAI is not configured on the server." }, { status: 503 });

  const { sessionId, artifactId } = await params;
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(sessionId) || !/^[A-Za-z0-9_-]{1,200}$/.test(artifactId)) {
    return NextResponse.json({ error: "That artifact link is invalid." }, { status: 400 });
  }

  const headers = { Authorization: `Bearer ${apiKey}`, "OpenAI-Beta": "agents=v1" };
  const listResponse = await fetch(`${OPENAI_ARTIFACTS_URL}/${sessionId}/artifacts?limit=100`, {
    headers,
    cache: "no-store",
  });
  if (!listResponse.ok) {
    return NextResponse.json({ error: "The report could not be found for this session." }, { status: listResponse.status });
  }

  const listing = (await listResponse.json()) as { data?: Array<{ id?: string; path?: string }> };
  const artifact = listing.data?.find((item) => item.id === artifactId && item.path);
  if (!artifact?.path) return NextResponse.json({ error: "That file is no longer available." }, { status: 404 });

  const contentResponse = await fetch(
    `${OPENAI_ARTIFACTS_URL}/${sessionId}/artifacts/${artifactId}/content`,
    { headers, cache: "no-store" },
  );
  if (!contentResponse.ok || !contentResponse.body) {
    return NextResponse.json({ error: "The report file could not be downloaded." }, { status: contentResponse.status || 502 });
  }

  const fileName = artifact.path.split("/").pop() || "analysis-report";
  const safeName = fileName.replace(/[\r\n"\\]/g, "_");
  const isImage = /\.(png|jpe?g|gif|webp)$/i.test(fileName);
  const inline = new URL(request.url).searchParams.get("inline") === "1" && isImage;
  const mediaType = contentResponse.headers.get("content-type") || (isImage ? "image/png" : "application/octet-stream");

  return new Response(contentResponse.body, {
    headers: {
      "Content-Type": mediaType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
