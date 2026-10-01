import * as Contacts from 'expo-contacts';
import * as Crypto from 'expo-crypto';
import { ContactMatch, matchContacts } from './api';

export type ContactResult = ContactMatch & { contactName: string };

/**
 * Finds which of your contacts are on CHEERS!.
 * Each email is turned into a one-way SHA-256 code on the phone; only those codes are sent.
 */
export async function findFriendsFromContacts(): Promise<{ granted: boolean; results: ContactResult[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return { granted: false, results: [] };

  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.Emails, Contacts.Fields.Name] });

  // email -> the name it's saved under in your contacts
  const nameByEmail = new Map<string, string>();
  for (const c of data) {
    for (const e of c.emails ?? []) {
      const email = e.email?.trim().toLowerCase();
      if (email && email.includes('@') && !nameByEmail.has(email)) nameByEmail.set(email, c.name || email);
    }
  }

  // Hash in small groups so large address books stay responsive
  const emails = [...nameByEmail.keys()];
  const nameByHash = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 200) {
    const group = emails.slice(i, i + 200);
    const hashes = await Promise.all(group.map((e) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, e)));
    hashes.forEach((h, j) => nameByHash.set(h, nameByEmail.get(group[j])!));
  }

  // Ask the server in batches it accepts
  const allHashes = [...nameByHash.keys()];
  const results: ContactResult[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < allHashes.length; i += 1000) {
    for (const m of await matchContacts(allHashes.slice(i, i + 1000))) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      results.push({ ...m, contactName: nameByHash.get(m.email_hash) ?? m.display_name });
    }
  }
  results.sort((a, b) => a.contactName.localeCompare(b.contactName));
  return { granted: true, results };
}
