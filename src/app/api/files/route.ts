import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("class-files")
    .download(path);

  if (error || !data) {
    console.error("DOWNLOAD ERROR:", error);
    return NextResponse.json(
      { error: "Could not download file" },
      { status: 500 }
    );
  }

  const arrayBuffer = await data.arrayBuffer();

  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${path.split("/").pop()}"`,
    },
  });
}