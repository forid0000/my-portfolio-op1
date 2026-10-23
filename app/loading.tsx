/**
 * Route loading indicator: a thin bar along the top edge.
 *
 * It must never cover the page. The previous version was a full-screen overlay
 * with a fake percentage counter, a 60 ms timer and large blurred layers; it hid
 * the navigation while a route loaded and cost more than the route itself.
 * This one is a server component (no JavaScript is sent), animates only
 * `transform`, ignores pointer events, and is switched off by the global
 * `prefers-reduced-motion` rule.
 */
export default function Loading() {
  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-busy="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden"
    >
      <div className="route-progress-bar h-full w-1/3 bg-primary" />
    </div>
  );
}
