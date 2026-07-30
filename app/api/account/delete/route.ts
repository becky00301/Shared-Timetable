import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DELETE_CONFIRMATION = "DELETE";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase-unconfigured" }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  const { data: owned, error: ownedError } = await supabase
    .from("projects")
    .select("id")
    .eq("owner_id", user.id);
  if (ownedError) {
    console.error(ownedError);
    return NextResponse.json({ error: "lookup-failed" }, { status: 500 });
  }

  const memberCounts = await Promise.all(
    (owned ?? []).map(async (project) => {
      const { count, error } = await supabase
        .from("project_members")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .neq("user_id", user.id);
      if (error) throw error;
      return count ?? 0;
    })
  ).catch((error) => {
    console.error(error);
    return null;
  });

  if (!memberCounts) {
    return NextResponse.json({ error: "lookup-failed" }, { status: 500 });
  }

  const response = NextResponse.json({
    willDelete: memberCounts.filter((count) => count === 0).length,
    willTransfer: memberCounts.filter((count) => count > 0).length
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase-unconfigured" }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous || !user.email) {
    return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  }

  let body: { password?: unknown; confirmation?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (!password || body.confirmation !== DELETE_CONFIRMATION) {
    return NextResponse.json({ error: "confirmation-required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "service-role-missing" }, { status: 500 });
  }

  // Verify the current password without replacing the browser's existing
  // session. The verifier never persists the short-lived session it receives.
  const { url, key } = getSupabasePublicConfig();
  const verifier = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email,
    password
  });
  if (passwordError) {
    return NextResponse.json({ error: "invalid-password" }, { status: 403 });
  }

  // The RPC locks every owned project and completes all public-data changes in
  // one transaction. It is idempotent, so a failed Auth deletion can be retried.
  const { data: prepared, error: prepareError } = await admin.rpc("prepare_account_deletion", {
    target_user_id: user.id
  });
  if (prepareError) {
    console.error(prepareError);
    return NextResponse.json({ error: "prepare-failed" }, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error(deleteError);
    return NextResponse.json({ error: "account-delete-failed" }, { status: 500 });
  }

  // Auth deletion does not clear the browser's cookie by itself. The deleted
  // user can no longer refresh it, but clearing it avoids a stale signed-in UI.
  await supabase.auth.signOut({ scope: "local" });

  const result = prepared?.[0];
  return NextResponse.json({
    ok: true,
    transferred: result?.transferred ?? 0,
    deleted: result?.deleted ?? 0
  });
}
