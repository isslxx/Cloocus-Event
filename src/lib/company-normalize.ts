const SUFFIXES = [
  /\s*\(주\)\s*/g,
  /\s*주식회사\s*/g,
  /\s*\(유\)\s*/g,
  /\s*유한회사\s*/g,
  /\s*\(사\)\s*/g,
  /\s*\(재\)\s*/g,
  /\s*,?\s*Inc\.?\s*/gi,
  /\s*,?\s*Corp\.?\s*/gi,
  /\s*,?\s*Ltd\.?\s*/gi,
  /\s*,?\s*LLC\.?\s*/gi,
  /\s*,?\s*Co\.?\s*/gi,
];

export function normalizeCompanyName(raw: string): string {
  let name = raw.trim();
  for (const suffix of SUFFIXES) {
    name = name.replace(suffix, ' ');
  }
  return name.replace(/\s+/g, ' ').trim();
}
