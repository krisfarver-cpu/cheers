import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { INVITE_URL } from './config';

/** The text that goes with a shared CHEERS!, e.g. "🍻 CHEERS! from Kris at Harbor Tap Room. ..." */
export function inviteMessage(opts: { displayName?: string | null; username?: string | null; location?: string | null }) {
  const from = opts.displayName ? ` from ${opts.displayName}` : '';
  const at = opts.location ? ` at ${opts.location}` : '';
  const addMe = opts.username ? ` Add me: @${opts.username}` : '';
  return `🍻 CHEERS!${from}${at}. Get the app and cheers back: ${INVITE_URL}${addMe}`;
}

/**
 * Opens the share sheet with a drink photo and invite text.
 * Pass a local file (just picked or taken) or a remote URL (a CHEERS! already sent).
 * On iPhone, the sheet lists recent Messages threads, including group chats.
 * Returns true if the person actually shared it.
 */
export async function shareCheersPhoto(opts: {
  localUri?: string;
  remoteUrl?: string;
  fileName?: string;
  message: string;
}): Promise<boolean> {
  let uri = opts.localUri;

  if (!uri && opts.remoteUrl) {
    const dest = new File(Paths.cache, `share-${opts.fileName ?? 'cheers.jpg'}`);
    if (dest.exists) dest.delete();
    const downloaded = await File.downloadFileAsync(opts.remoteUrl, dest);
    uri = downloaded.uri;
  }

  // iOS can send the photo and text together. Android's built-in sheet only takes text.
  const content = Platform.OS === 'ios' && uri
    ? { url: uri, message: opts.message }
    : { message: opts.message, title: 'CHEERS!' };

  const result = await Share.share(content);
  return result.action === Share.sharedAction;
}
