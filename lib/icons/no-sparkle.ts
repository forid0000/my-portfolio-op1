/**
 * The "AI sparkle" family of icons (Sparkles, Stars, magic wands, Material "auto awesome" and their
 * lookalikes in every icon pack) is not used anywhere on this site. Names saved earlier, or typed
 * by hand, still resolve, but to a plain star. Pure: safe in server and client code.
 */
const SPARKLE_NAME = /sparkl|stars$|magic|wand|auto_?awesome|glitter|twinkl/i;

/** The icon shown in place of a sparkle icon. */
export const SPARKLE_REPLACEMENT = 'Star';

export function isSparkleIcon(name: string | null | undefined): boolean {
  return !!name && SPARKLE_NAME.test(name);
}

/** The name to actually draw: a sparkle icon becomes the plain star, anything else is unchanged. */
export function plainIconName(name: string): string {
  return isSparkleIcon(name) ? SPARKLE_REPLACEMENT : name;
}
