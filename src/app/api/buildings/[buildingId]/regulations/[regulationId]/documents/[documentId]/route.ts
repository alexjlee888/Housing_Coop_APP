import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureUser } from "@/lib/ensure-user";
import { assertMembership, assertRole } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Params = { params: Promise<{ buildingId: string; regulationId: string; documentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { buildingId, regulationId, documentId } = await params;
  try {
    await ensureUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await assertMembership(buildingId);
  assertRole(membership, "BOARD_MEMBER");

  const document = await db.document.findUnique({
    where: { id: documentId },
    include: { regulation: { select: { buildingId: true } } },
  });

  if (!document || document.regulation.buildingId !== buildingId || document.regulationId !== regulationId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Extract storage path from URL
  const url = new URL(document.fileUrl);
  const pathParts = url.pathname.split("/storage/v1/object/public/documents/");
  if (pathParts[1]) {
    await supabase.storage.from("documents").remove([pathParts[1]]);
  }

  await db.document.delete({ where: { id: documentId } });
  return NextResponse.json({ deleted: true });
}
