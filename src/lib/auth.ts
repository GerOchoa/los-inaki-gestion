export const NICK_DOMAIN = "losinaki.local";

export function nickToEmail(nick: string): string {
  const clean = nick.trim().toLowerCase().replace(/\s+/g, "");
  return `${clean}@${NICK_DOMAIN}`;
}
