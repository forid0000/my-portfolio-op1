/**
 * Serializes a JSON-LD object for embedding via `dangerouslySetInnerHTML`.
 * Plain `JSON.stringify` doesn't escape `<`, so a value containing the
 * literal string `</script>` (e.g. a note or article title) would close the
 * script tag early and let the rest of the string execute as HTML/JS. The
 * `<` escape is invisible to `JSON.parse` (identical output) but can't
 * be interpreted as a tag by the HTML parser.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
