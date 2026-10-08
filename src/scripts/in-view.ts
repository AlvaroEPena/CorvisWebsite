/**
 * Marks elements with `data-in-view` while they are on (or near) the screen. CSS only runs the
 * long-lived decorative animations (browser-mock scroll-through, water drift) while the mark is
 * present, so off-screen work costs nothing.
 */
export function observeInView(selector: string): void {
  const hosts = document.querySelectorAll<HTMLElement>(selector);
  if (hosts.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.toggleAttribute('data-in-view', entry.isIntersecting);
      }
    },
    { rootMargin: '120px 0px' },
  );
  hosts.forEach((host) => observer.observe(host));
}
