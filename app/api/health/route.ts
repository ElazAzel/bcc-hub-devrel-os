import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const localMode = process.env.NEXT_PUBLIC_DATA_MODE === "local";
  const supabaseConfigured = !localMode && Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  return NextResponse.json(
    {
      status: "ok",
      mode: supabaseConfigured ? "cloud" : "local",
      supabaseConfigured,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
