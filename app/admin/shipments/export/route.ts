import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  await requireAdmin();
  return NextResponse.redirect(new URL("/admin/events", request.url));
}
