// Sends a "CHEERS!" push when a cheers is created, and a "cheered back" push when the recipient reacts.
// Triggered by a Supabase Database Webhook on the public.cheers table (INSERT and UPDATE).
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type, record, old_record } = await req.json();

  let toUser: string;
  let fromUser: string;
  let kind: 'new' | 'back' | 'reply';

  if (type === 'INSERT') {
    toUser = record.recipient_id;
    fromUser = record.sender_id;
    kind = record.reply_to_id ? 'reply' : 'new';
  } else if (type === 'UPDATE' && record.cheered_back_at && !old_record?.cheered_back_at) {
    toUser = record.sender_id;
    fromUser = record.recipient_id;
    kind = 'back';
    // If they answered with a photo, that CHEERS! sends its own alert, so skip this one
    const { count } = await supabase.from('cheers').select('id', { count: 'exact', head: true }).eq('reply_to_id', record.id);
    if (count) return new Response('Photo reply already notified');
  } else {
    return new Response('Nothing to send');
  }

  const [{ data: sender }, { data: tokens }] = await Promise.all([
    supabase.from('profiles').select('display_name').eq('id', fromUser).single(),
    supabase.from('push_tokens').select('token').eq('user_id', toUser),
  ]);
  if (!tokens?.length) return new Response('No devices registered');

  const name = sender?.display_name ?? 'A friend';
  const messages = tokens.map(({ token }) => ({
    to: token,
    sound: 'default',
    title: 'CHEERS!',
    body: kind === 'new' ? `${name} sent you a drink 🥂`
      : kind === 'reply' ? `${name} cheered back with a drink 🍻`
      : `${name} cheered back 🥂`,
    data: { cheersId: record.id, kind },
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  const result = await res.json();

  // Clean up tokens for devices that uninstalled the app
  const dead = (result.data ?? [])
    .map((r: any, i: number) => (r.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter(Boolean);
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);

  return new Response(JSON.stringify(result), { status: res.status });
});
