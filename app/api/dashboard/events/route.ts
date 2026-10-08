import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBangkokDate } from "@/lib/event-registration";
import { getMyEventsPage } from "@/lib/my-events-data";
import {
  clampMyEventsOffset,
  clampMyEventsPageSize,
  parseMyEventsTab,
} from "@/lib/my-events";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tab = parseMyEventsTab(request.nextUrl.searchParams.get("tab"));
  const offset = clampMyEventsOffset(request.nextUrl.searchParams.get("offset"));
  const limit = clampMyEventsPageSize(request.nextUrl.searchParams.get("limit"));

  try {
    const page = await getMyEventsPage(
      supabase,
      user.id,
      tab,
      getBangkokDate(),
      offset,
      limit,
    );
    return NextResponse.json(page);
  } catch (error) {
    console.error("Unable to load the user's events", error);
    return NextResponse.json({ error: "Unable to load events" }, { status: 500 });
  }
}
