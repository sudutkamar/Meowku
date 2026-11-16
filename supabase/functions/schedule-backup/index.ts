import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  const secret = req.headers.get("x-backup-secret");
  if (secret !== Deno.env.get("BACKUP_SECRET")) return new Response("unauthorized", { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
