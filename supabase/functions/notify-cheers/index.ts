// Sends CHEERS! push notifications. Triggered from the database (see the notify_cheers_webhook trigger):
// - a new CHEERS! to a friend or a group
// - a friend cheering back (or cheering back with a photo)
// - someone cheering a drink in a group
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
const ok = (msg: string) => new Response(msg);

async function displayName(id: string) {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', id).single();
  return data?.display_name ?? 'A friend';
}
async function groupName(id: string) {
  const { data } = await supabase.from('groups').select('name').eq('id', id).single();
  return data?.name ?? 'your group';
}
/** Drops anyone who has blocked the sender */
async function withoutBlockers(userIds: string[], senderId: string) {
  if (!userIds.length) return userIds;
  const { data } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', senderId).in('blocker_id', userIds);
  const blockers = new Set((data ?? []).map((b) => b.blocker_id));
  return userIds.filter((u) => !blockers.has(u));
}

Deno.serve(async (req) => {
  if (!WEBHOOK_SECRET || req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { type, table, record, old_record } = await req.json();

  let toUsers: string[] = [];
  let body = '';
  let data: Record<string, unknown> = {};

  if (table === 'friendships') {
    if (type === 'INSERT' && record.status === 'pending') {
      toUsers = [record.addressee_id];
      body = `${await displayName(record.requester_id)} sent you a friend request 🍻`;
      data = { kind: 'friend_request', userId: record.requester_id };
    } else if (type === 'UPDATE' && record.status === 'accepted' && old_record?.status !== 'accepted') {
      toUsers = [record.requester_id];
      body = `${await displayName(record.addressee_id)} accepted your friend request 🍻`;
      data = { kind: 'friend_accepted', userId: record.addressee_id };
    } else return ok('Nothing to send');
  } else if (table === 'group_reactions') {
    if (type !== 'INSERT' || record.kind !== 'cheers') return ok('Nothing to send');
    const { data: post } = await supabase.from('cheers').select('id, sender_id, group_id').eq('id', record.cheers_id).single();
    if (!post || post.sender_id === record.user_id) return ok('Nothing to send');
    toUsers = await withoutBlockers([post.sender_id], record.user_id);
    body = `${await displayName(record.user_id)} cheered your drink in ${await groupName(post.group_id)} 🥂`;
    data = { cheersId: post.id, groupId: post.group_id, kind: 'group_cheers' };
  } else if (type === 'INSERT' && record.group_id) {
    const { data: members } = await supabase.from('group_members').select('user_id').eq('group_id', record.group_id);
    toUsers = await withoutBlockers((members ?? []).map((m) => m.user_id).filter((u) => u !== record.sender_id), record.sender_id);
    const what = record.reply_to_id ? 'cheered back with a drink 🍻' : 'sent a drink 🥂';
    body = `${await displayName(record.sender_id)} → ${await groupName(record.group_id)}: ${what}`;
    data = { cheersId: record.id, groupId: record.group_id, kind: 'group_new' };
  } else if (type === 'INSERT') {
    toUsers = [record.recipient_id];
    const name = await displayName(record.sender_id);
    body = record.reply_to_id ? `${name} cheered back with a drink 🍻` : `${name} sent you a drink 🥂`;
    data = { cheersId: record.id, kind: record.reply_to_id ? 'reply' : 'new' };
  } else if (type === 'UPDATE' && record.cheered_back_at && !old_record?.cheered_back_at && record.recipient_id) {
    // If they answered with a photo, that CHEERS! sends its own alert
    const { count } = await supabase.from('cheers').select('id', { count: 'exact', head: true }).eq('reply_to_id', record.id);
    if (count) return ok('Photo reply already notified');
    toUsers = [record.sender_id];
    body = `${await displayName(record.recipient_id)} cheered back 🥂`;
    data = { cheersId: record.id, kind: 'back' };
  } else {
    return ok('Nothing to send');
  }

  if (!toUsers.length) return ok('No one to notify');
  const { data: tokens } = await supabase.from('push_tokens').select('token').in('user_id', toUsers);
  if (!tokens?.length) return ok('No devices registered');

  const messages = tokens.map(({ token }) => ({ to: token, sound: 'default', title: 'CHEERS!', body, data }));
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
