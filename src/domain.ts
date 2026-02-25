const BRAND_TITLES: Record<string, string> = {
  github: 'GitHub',
  gitlab: 'GitLab',
  youtube: 'YouTube',
  stackoverflow: 'Stack Overflow',
  linkedin: 'LinkedIn',
  reddit: 'Reddit',
  wikipedia: 'Wikipedia',
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  npmjs: 'npm',
  paypal: 'PayPal',
  whatsapp: 'WhatsApp',
  openai: 'OpenAI',
  chatgpt: 'ChatGPT',
  hackernews: 'Hacker News',
};

const IP_PATTERN = /^\d{1,3}\.\d{1,3}$/;

export function getDomainKey(url: string | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;

  let hostname = parsed.hostname;

  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  const parts = hostname.split('.');

  // Need at least two parts to form a valid eTLD+1 (e.g. "github.com")
  if (parts.length < 2) return null;

  const etld1 = parts.slice(-2).join('.');

  // Reject bare IP-address-like results
  if (IP_PATTERN.test(etld1)) return null;

  // Reject if the label part (before TLD) is empty
  if (!parts[parts.length - 2]) return null;

  return etld1;
}

export function humanReadableTitleFromDomain(domainKey: string): string {
  const label = domainKey.split('.')[0] ?? domainKey;

  const known = BRAND_TITLES[label.toLowerCase()];
  if (known) return known;

  return label.charAt(0).toUpperCase() + label.slice(1);
}
