/**
 * iOS keeps the layout viewport at full height when the keyboard opens, so anything pinned to
 * the bottom of the screen ends up behind it. Mirror the visual viewport (the part that is
 * actually visible) into CSS variables so overlays can size themselves to it.
 */
export function trackVisualViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;

  const update = () => {
    const style = document.documentElement.style;
    style.setProperty('--vv-top', `${viewport.offsetTop}px`);
    style.setProperty('--vv-height', `${viewport.height}px`);
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
}
