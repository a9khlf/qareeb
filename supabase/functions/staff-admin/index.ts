// Qareeb "staff-admin" Edge Function
// Lets an OWNER create, re-password and delete staff logins from the admin page.
// The browser can never create logins by itself (that needs a secret key), so this
// small server-side function does it. Supabase puts the secret key into the function
// automatically; it is never written in the project files and never sent to the browser.
//
// Every call is checked: the caller must be signed in AND be an owner (public.has_perm('owner')).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  if (!url || !anon || !secret) return json({ error: "The server is missing its keys. Check the function settings." }, 500);
  const auth = req.headers.get("Authorization") ?? "";

  // 1) Who is calling, and are they an owner?
  const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const me = await caller.auth.getUser();
  const myEmail = (me.data.user?.email ?? "").toLowerCase();
  if (!myEmail) return json({ error: "Please sign in again." }, 401);
  const owner = await caller.rpc("has_perm", { p: "owner" });
  if (owner.data !== true) return json({ error: "Only an owner can manage staff logins." }, 403);

  // 2) What do they want?
  let body: { action?: string; email?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad request." }, 400); }
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "That email does not look right." }, 400);

  const admin = createClient(url, secret, { auth: { persistSession: false } });
  async function findUser(e: string) {
    for (let page = 1; page <= 10; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const u = data.users.find((x) => (x.email ?? "").toLowerCase() === e);
      if (u) return u;
      if (data.users.length < 200) break;
    }
    return null;
  }

  try {
    if (body.action === "create") {
      if (password.length < 8) return json({ error: "The password needs at least 8 characters." }, 400);
      const existing = await findUser(email);
      if (existing) return json({ error: "A login for this email already exists. Use 'Set a new password' instead." }, 409);
      const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "set_password") {
      if (password.length < 8) return json({ error: "The password needs at least 8 characters." }, 400);
      const u = await findUser(email);
      if (!u) return json({ error: "No login exists for this email yet." }, 404);
      const { error } = await admin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (body.action === "remove") {
      if (email === myEmail) return json({ error: "You cannot delete your own login." }, 400);
      // Safety: only delete the login of someone who is no longer on the staff list.
      const still = await admin.from("staff").select("email").eq("email", email).maybeSingle();
      if (still.data) return json({ error: "Remove the person from the staff list first." }, 409);
      const u = await findUser(email);
      if (!u) return json({ ok: true });
      const { error } = await admin.auth.admin.deleteUser(u.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: (e as Error).message || "Something went wrong." }, 500);
  }
});
