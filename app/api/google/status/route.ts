import { NextResponse } from "next/server";
import { getGoogleConfig } from "@/lib/google/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = getGoogleConfig().configured;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (!user) return NextResponse.json({ configured, connected: false, email: null });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ configured: false, connected: false, email: null });

  const { data } = await admin
    .from("google_accounts")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    configured,
    connected: Boolean(data),
    email: data?.google_email ?? null
  });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not-configured" }, { status: 500 });

  const { error } = await admin.from("google_accounts").delete().eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
