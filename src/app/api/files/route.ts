import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path || path.startsWith("/") || path.includes("..") || path.includes("\0")) {
    return NextResponse.json({ error: "Ugyldig filsti" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login kræves" }, { status: 401 });
  }

  const { data, error } = await supabase.storage
    .from("class-files")
    .download(path);

  if (error || !data) {
    console.error("File download failed", { path, message: error?.message });
    return NextResponse.json(
      { error: "Filen blev ikke fundet, eller du har ikke adgang" },
      { status: 404 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();
  const rawFilename = path.split("/").pop() || "download";
  const filename = rawFilename.replace(/["\\\r\n]/g, "_");

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
