import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Params = { params: Promise<{ buildingId: string; regulationId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { buildingId, regulationId } = await params;
  try {
    await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "BOARD_MEMBER");

  const regulation = await db.regulation.findUnique({ where: { id: regulationId } });
  if (!regulation || regulation.buildingId !== buildingId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "text/plain"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, JPEG, and TXT files are allowed." }, { status: 400 });
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File must be under 10 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${buildingId}/${regulationId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Supabase upload error:", uploadError);
    return NextResponse.json({ error: "File upload failed." }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

  const document = await db.document.create({
    data: {
      regulationId,
      fileName: file.name,
      fileUrl: urlData.publicUrl,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
