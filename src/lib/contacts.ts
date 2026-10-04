import * as Contacts from 'expo-contacts/legacy';
import * as Crypto from 'expo-crypto';
import { ContactMatch, matchContacts } from './api';
import { phoneDigits } from './phone';

export type ContactResult = ContactMatch & { contactName: string };

/**
 * Finds which of your contacts are on CHEERS!.
 * Each email and phone number is turned into a one-way SHA-256 code on the phone; only those codes are sent.
 * Phone numbers only match people who verified theirs by text.
 */
export async function findFriendsFromContacts(): Promise<{ granted: boolean; results: ContactResult[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') return { granted: false, results: [] };

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
  });

  // email or phone digits -> the name it's saved under in your contacts
  const nameByKey = new Map<string, string>();
  for (const c of data) {
    const name = c.name || '';
    for (const e of c.emails ?? []) {
      const email = e.email?.trim().toLowerCase();
      if (email && email.includes('@') && !nameByKey.has(email)) nameByKey.set(email, name || email);
    }
    for (const p of c.phoneNumbers ?? []) {
      const digits = phoneDigits(p.number ?? p.digits);
      if (digits && !nameByKey.has(digits)) nameByKey.set(digits, name || digits);
    }
  }

  // Hash in small groups so large address books stay responsive
  const keys = [...nameByKey.keys()];
  const nameByHash = new Map<string, string>();
  for (let i = 0; i < keys.length; i += 200) {
    const group = keys.slice(i, i + 200);
    const hashes = await Promise.all(group.map((k) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, k)));
    hashes.forEach((h, j) => nameByHash.set(h, nameByKey.get(group[j])!));
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
