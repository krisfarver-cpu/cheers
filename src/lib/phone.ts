/**
 * Turns a phone number as typed or saved in contacts into digits with country code, e.g. "15551234567".
 * Assumes US numbers unless the number starts with "+". Returns null if it can't tell.
 */
export function phoneDigits(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (raw.trim().startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? digits : null;
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return null;
}

/** "15551234567" -> "(555) 123-4567"; other countries -> "+44 …" */
export function formatPhone(digits?: string | null): string {
  if (!digits) return '';
  const d = digits.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+${d}`;
}
