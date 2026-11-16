import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req) => {
  const secret = req.headers.get("x-digest-secret");
  if (secret !== Deno.env.get("DIGEST_SECRET")) return new Response("unauthorized", { status: 401 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
});
