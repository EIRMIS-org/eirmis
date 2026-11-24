import { createClient } from "npm:@supabase/supabase-js@2";
import { validateHtml } from "./validate.ts";

const url = Deno.env.get("SUPABASE_URL")!;
const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = db.storage.from("invitation-html");
const maxFile = 2 * 1024 * 1024;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
const error = (status: number, message: string) => json({ code: "UPLOAD_" + status, message }, status);

async function upload(req: Request) {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return error(405, "Use POST.");
  const jwt = /^Bearer (.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!jwt) return error(401, "Organizer authentication required.");
  const { data: { user }, error: authError } = await db.auth.getUser(jwt);
  if (authError || !user) return error(401, "Invalid access token.");

  const type = req.headers.get("content-type") ?? "";
  if (!/^multipart\/form-data;/i.test(type) || !req.body) return error(400, "Expected multipart form data.");
  const reader = req.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxFile + 65536) {
      await reader.cancel();
      return error(413, "Upload exceeds the size limit.");
    }
    chunks.push(new Uint8Array(value));
  }
  let form: FormData;
  try {
    form = await new Response(new Blob(chunks), { headers: { "content-type": type } }).formData();
  } catch {
    return error(400, "Malformed multipart form.");
  }
  const file = form.get("file");
  const eventId = form.get("event_id");
  if (form.getAll("file").length !== 1 || !(file instanceof File) || file.type !== "text/html") {
    return error(400, "Provide one text/html file.");
  }
  if (file.size > maxFile) return error(413, "HTML file exceeds 2 MiB.");
  if (typeof eventId !== "string" || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(eventId)) {
    return error(400, "Invalid event_id.");
  }
  const event = await db.from("events").select("id").eq("id", eventId)
    .eq("organizer_id", user.id).is("deleted_at", null).maybeSingle();
  if (event.error) throw event.error;
  if (!event.data) return error(403, "Event ownership required.");

  const errors = validateHtml(await file.text());
  if (errors.length) return json({ errors }, 422);
  const scanner = Deno.env.get("SCANNER_SUBMIT_URL");
  const key = Deno.env.get("SCANNER_API_KEY");
  const callback = Deno.env.get("SCANNER_CALLBACK_URL");
  if (!scanner || !key || !callback) return error(503, "Scanner is unavailable.");
  const id = crypto.randomUUID();
  const path = eventId + "/" + id + ".html";
  const stored = await bucket.upload(path, file, { contentType: "text/html" });
  if (stored.error) throw stored.error;
  const design = await db.from("invitation_designs").upsert({
    event_id: eventId, design_type: "html", html_storage_path: path, scan_id: id,
    validation_status: "pending", validated_at: null, validation_notes: null,
  }, { onConflict: "event_id" }).select("id,event_id,design_type,html_storage_path,validation_status,validation_notes,validated_at,created_at,updated_at").single();
  if (design.error) {
    await bucket.remove([path]);
    throw design.error;
  }
  const job = new FormData();
  job.set("scan_id", id);
  job.set("callback_url", callback);
  job.set("file", file, id + ".html");
  try {
    const response = await fetch(scanner, { method: "POST", headers: { Authorization: "Bearer " + key },
      body: job, redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error("Scanner rejected job");
  } catch {
    const failed = await db.from("invitation_designs").update({
      validation_status: "failed", validation_notes: "Scanner submission failed. Please re-upload.",
    }).eq("scan_id", id).eq("validation_status", "pending");
    if (failed.error) throw failed.error;
    return error(503, "Scanner submission failed. Please re-upload.");
  }
  return json({ design: design.data, errors: [] });
}

Deno.serve(async req => {
  try { return await upload(req); }
  catch { return error(500, "Unable to process invitation upload."); }
});
