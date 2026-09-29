// Permanently deletes the signed-in person's account, photos, and data.
// Called from the app's Account screen. Deploy WITH JWT verification (the default).
import { createClient } from 'npm:@supabase/supabase-js@2';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const BUCKET = 'cheers-photos';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data, error } = await admin.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return json({ error: 'Not signed in' }, 401);

  // 1. Delete every photo this person uploaded (they all live under <user id>/)
  const bucket = admin.storage.from(BUCKET);
  for (let i = 0; i < 100; i++) {
    const { data: files, error: listError } = await bucket.list(user.id, { limit: 100 });
    if (listError) return json({ error: `Couldn't list photos: ${listError.message}` }, 500);
    if (!files?.length) break;
    const { error: removeError } = await bucket.remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) return json({ error: `Couldn't delete photos: ${removeError.message}` }, 500);
  }

  // 2. Delete the account. Profile, CHEERS!, friendships, blocks and push tokens cascade with it.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ deleted: true });
});
