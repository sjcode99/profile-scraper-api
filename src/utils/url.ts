export function extractVanityName(value: string): string | null {
  if (!value) return null;

  const cleaned = value.trim();

  // Try regex matching strictly for LinkedIn URLs (with or without protocol/www/leading slash)
  // E.g., /www.linkedin.com/in/surajlal99, www.linkedin.com/in/surajlal99, https://www.linkedin.com/in/surajlal99
  const regex =
    /^(?:\/)?(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i;
  const match = cleaned.match(regex);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  return null;
}
