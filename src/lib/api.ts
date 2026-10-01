import { Platform } from 'react-native';
import { supabase } from './supabase';

const BUCKET = 'cheers-photos';
const PROFILE_FIELDS = 'id, username, display_name, avatar_url';

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

export type Cheers = {
  id: string;
  sender_id: string;
  recipient_id: string;
  photo_path: string;
  location_name: string | null;
  created_at: string;
  opened_at: string | null;
  liked_at: string | null;
  cheered_back_at: string | null;
  sender?: Profile;
  recipient?: Profile;
};

export type FriendSummary = {
  friend: Profile;
  sent: number;
  received: number;
  cheeredBack: number;
  total: number;
  lastAt: string | null;
};

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/* ---------------- Auth ---------------- */

export async function signUp(email: string, password: string, username: string, displayName: string) {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: username.trim().toLowerCase(), display_name: displayName.trim() } },
  });
  if (error) throw error;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getMyProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', await myId()).single();
  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('username_available', { name: username.trim().toLowerCase() });
  if (error) throw error;
  return data as boolean;
}

export async function getProfile(id: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', id).single();
  if (error) throw error;
  return data;
}

/* ---------------- Push tokens ---------------- */

export async function savePushToken(token: string) {
  const { error } = await supabase
    .from('push_tokens')
    .upsert({ user_id: await myId(), token, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/* ---------------- Friends ---------------- */

export async function findByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('username', username.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function sendFriendRequest(friendId: string) {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: await myId(), addressee_id: friendId });
  if (error) throw error;
}

export async function acceptFriendRequest(requesterId: string) {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', await myId());
  if (error) throw error;
}

export async function removeFriend(otherId: string) {
  const me = await myId();
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`);
  if (error) throw error;
}

/** Returns accepted friends plus pending requests in each direction. */
export async function listFriends() {
  const me = await myId();
  const { data, error } = await supabase
    .from('friendships')
    .select(`status, requester_id, addressee_id,
      requester:profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),
      addressee:profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})`);
  if (error) throw error;

  const friends: Profile[] = [];
  const incoming: Profile[] = [];
  const outgoing: Profile[] = [];
  for (const row of data as any[]) {
    const iAsked = row.requester_id === me;
    const other: Profile = iAsked ? row.addressee : row.requester;
    if (row.status === 'accepted') friends.push(other);
    else (iAsked ? outgoing : incoming).push(other);
  }
  friends.sort((a, b) => a.display_name.localeCompare(b.display_name));
  return { friends, incoming, outgoing };
}

/* ---------------- Sending ---------------- */

async function uploadPhoto(path: string, uri: string, contentType: string) {
  const attempt = async () => {
    let body: any;
    if (Platform.OS === 'android') {
      body = new FormData();
      body.append('file', { uri, name: path.split('/').pop(), type: contentType } as any);
    } else {
      body = await fetch(uri).then((r) => r.arrayBuffer());
    }
    const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: true });
    if (error) throw error;
  };
  try { await attempt(); } catch (e) { await new Promise((r) => setTimeout(r, 1500)); await attempt(); }
}


/** Uploads one photo, then creates a CHEERS! row for each recipient. */
export async function sendCheers(opts: {
  photoUri: string;
  mimeType?: string | null;
  locationName?: string;
  recipientIds: string[];
}): Promise<Cheers[]> {
  if (!opts.recipientIds.length) throw new Error('Pick at least one friend');
  const me = await myId();
  const contentType = opts.mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1] ?? 'jpg';
  const path = `${me}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  await uploadPhoto(path, opts.photoUri, contentType);

  const location = opts.locationName?.trim() || null;
  const { data, error } = await supabase
    .from('cheers')
    .insert(opts.recipientIds.map((recipient_id) => ({ recipient_id, photo_path: path, location_name: location })))
    .select();
  if (error) throw error;
  return data;
}

/* ---------------- Reading ---------------- */

export async function getReceived(limit = 50): Promise<Cheers[]> {
  const { data, error } = await supabase
    .from('cheers')
    .select(`*, sender:profiles!cheers_sender_id_fkey(${PROFILE_FIELDS})`)
    .eq('recipient_id', await myId())
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getCheers(id: string): Promise<Cheers> {
  const { data, error } = await supabase
    .from('cheers')
    .select(`*, sender:profiles!cheers_sender_id_fkey(${PROFILE_FIELDS}),
                recipient:profiles!cheers_recipient_id_fkey(${PROFILE_FIELDS})`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Every CHEERS! between you and one friend, oldest first. */
export async function getThread(friendId: string): Promise<Cheers[]> {
  const me = await myId();
  const { data, error } = await supabase
    .from('cheers')
    .select('*')
    .or(`and(sender_id.eq.${me},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${me})`)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/** Tallies for the History tab. Fine for early users; move to a SQL view as volume grows. */
export async function getHistorySummary(): Promise<FriendSummary[]> {
  const me = await myId();
  const [{ friends }, { data, error }] = await Promise.all([
    listFriends(),
    supabase.from('cheers').select('sender_id, recipient_id, created_at, cheered_back_at'),
  ]);
  if (error) throw error;

  const byFriend = new Map<string, FriendSummary>(
    friends.map((f) => [f.id, { friend: f, sent: 0, received: 0, cheeredBack: 0, total: 0, lastAt: null }]),
  );
  for (const c of data) {
    const otherId = c.sender_id === me ? c.recipient_id : c.sender_id;
    const s = byFriend.get(otherId);
    if (!s) continue;
    if (c.sender_id === me) s.sent++;
    else s.received++;
    if (c.cheered_back_at) s.cheeredBack++;
    s.total = s.sent + s.received + s.cheeredBack;
    if (!s.lastAt || c.created_at > s.lastAt) s.lastAt = c.created_at;
  }
  return [...byFriend.values()].sort((a, b) => (b.lastAt ?? '').localeCompare(a.lastAt ?? ''));
}

/** Signed URLs for private photos (valid for one hour). */
export async function getPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths)];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(unique, 3600);
  if (error) throw error;
  return Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]));
}

/* ---------------- Reacting ---------------- */

export async function markOpened(id: string) {
  const { error } = await supabase
    .from('cheers')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', id)
    .is('opened_at', null);
  if (error) throw error;
}

export async function setLiked(id: string, liked: boolean) {
  const { error } = await supabase
    .from('cheers')
    .update({ liked_at: liked ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function cheersBack(id: string) {
  const { error } = await supabase
    .from('cheers')
    .update({ cheered_back_at: new Date().toISOString() })
    .eq('id', id)
    .is('cheered_back_at', null);
  if (error) throw error;
}

/* ---------------- Safety ---------------- */

export type ReportReason = 'nudity' | 'harassment' | 'violence' | 'underage' | 'spam' | 'other';

export async function reportContent(opts: {
  reportedUserId: string;
  cheersId?: string;
  photoPath?: string;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from('reports').insert({
    reported_user_id: opts.reportedUserId,
    cheers_id: opts.cheersId ?? null,
    photo_path: opts.photoPath ?? null,
    reason: opts.reason,
    details: opts.details?.trim() || null,
  });
  if (error) throw error;
}

/** Blocks someone: ends the friendship, stops requests and CHEERS!, and hides theirs from you. */
export async function blockUser(userId: string) {
  const { error } = await supabase.rpc('block_user', { target: userId });
  if (error) throw error;
}

export async function unblockUser(userId: string) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', await myId())
    .eq('blocked_id', userId);
  if (error) throw error;
}

export async function listBlocked(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('blocks')
    .select(`blocked:profiles!blocks_blocked_id_fkey(${PROFILE_FIELDS})`)
    .eq('blocker_id', await myId());
  if (error) throw error;
  return (data as any[]).map((r) => r.blocked).filter(Boolean);
}

/** Permanently deletes the account and everything in it, then signs out. */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}

/* ---------------- Live updates ---------------- */

/**
 * Calls onChange when a new CHEERS! arrives or a friend reacts to one you sent.
 * Returns a function that stops listening.
 */
export async function subscribeToCheers(onChange: (c: Cheers, kind: 'received' | 'reaction') => void) {
  const me = await myId();
  const channel = supabase
    .channel(`cheers-${me}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cheers', filter: `recipient_id=eq.${me}` },
      (p) => onChange(p.new as Cheers, 'received'))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cheers', filter: `sender_id=eq.${me}` },
      (p) => onChange(p.new as Cheers, 'reaction'))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
