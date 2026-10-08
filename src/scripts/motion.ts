/**
 * Lazy GSAP layer: light parallax only (the hero is fully visible without it). Loaded after first paint, and
 * every tween lives inside matchMedia so reduced-motion users get the static layout.
 * Motion has a job here: the parallax gives the floating objects depth against the panel.
 */
const root = document.documentElement;

async function startMotion(): Promise<void> {
  // Pages without parallax (sandbox, 404...) never need GSAP's weight.
  if (!document.querySelector('[data-parallax]')) {
    root.setAttribute('data-motion-ready', '');
    return;
  }
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((element) => {
      const depth = Number(element.dataset.parallax) || 10;
      gsap.to(element, {
        yPercent: depth,
        ease: 'none',
        scrollTrigger: {
          trigger: element.closest('section') ?? element,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  });

  root.setAttribute('data-motion-ready', '');
}

function whenIdle(task: () => void): void {
  if ('requestIdleCallback' in window) window.requestIdleCallback(task, { timeout: 1500 });
  else setTimeout(task, 300);
}

if (root.getAttribute('data-motion') === 'on') {
  const run = () =>
    whenIdle(() => {
      void startMotion();
      void import('./effects');
    });
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
