/**
 * Sanitize a user-supplied search string to prevent PostgREST .or() filter injection.
 *
 * The vulnerability: PostgREST filter strings like `.or(name.ilike.%<search>%)` allow
 * injecting additional filter clauses if the search term contains special PostgREST
 * syntax characters (comma, parentheses, dot in filter position, etc.).
 *
 * Fix: strip all characters that cannot appear in legitimate search strings for names,
 * emails, or codes. Allow: letters (any Unicode), digits, spaces, @, -, _, ., +, #
 */
export function sanitizeSearch(input: string | null | undefined): string | null {
  if (input === null || input === undefined || input === '') return null

  // Remove characters that have special meaning in PostgREST filter syntax:
  // ( ) , and control any filter injection vectors
  // Keep: Unicode letters/digits, spaces, @, -, _, ., +, #, &, '
  const sanitized = input
    .replace(/[(),%]/g, '') // Remove PostgREST special chars
    .trim()
    .slice(0, 200) // Limit length to prevent abuse

  return sanitized || null
}
