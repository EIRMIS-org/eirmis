const PLACEHOLDER_DOMAINS = [
  "@example.com",
  "@test.com",
  "@eirmis.local",
  "@yourdomain.com",
];

/**
 * Normalizes the Resend `from` address so local/CI environments configured with
 * unverified placeholder domains (e.g. `@eirmis.local`, `@yourdomain.com`)
 * automatically use Resend's verified sandbox sender (`onboarding@resend.dev`).
 */
export function resolveResendFrom(fromEmail: string): string {
  const lower = fromEmail.trim().toLowerCase();
  if (PLACEHOLDER_DOMAINS.some((domain) => lower.includes(domain))) {
    return "EIRMIS <onboarding@resend.dev>";
  }
  return fromEmail;
}

/**
 * Normalizes a Resend `to` recipient address so synthetic seed/test emails
 * (`@example.com`, `@test.com`, `@eirmis.local`) or Resend sandbox senders
 * (`@resend.dev`) route to Resend's official testing sink (`delivered@resend.dev`),
 * which Resend's API requires instead of RFC 2606 `@example.com` addresses.
 */
export function resolveResendTo(
  recipientEmail: string,
  resolvedFromEmail?: string,
): string {
  const lowerTo = recipientEmail.trim().toLowerCase();
  const lowerFrom = (resolvedFromEmail ?? "").toLowerCase();
  if (
    PLACEHOLDER_DOMAINS.some((domain) => lowerTo.endsWith(domain)) ||
    lowerFrom.includes("@resend.dev")
  ) {
    return "delivered@resend.dev";
  }
  return recipientEmail;
}
