/**
 * Lazy GSAP layer: hero-object entrance and light parallax only. Loaded after first paint, and
 * every tween lives inside matchMedia so reduced-motion users get the static layout.
 * Motion has a job here: the entrance directs attention to the hero composition, the parallax
 * gives the floating objects depth against the panel.
 */
const root = document.documentElement;

async function startMotion(): Promise<void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import('gsap'),
    import('gsap/ScrollTrigger'),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('[data-hero-obj]', {
      opacity: 0,
      y: 36,
      scale: 0.9,
      duration: 1.1,
      stagger: 0.1,
      ease: 'power3.out',
    });

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
  const run = () => whenIdle(() => void startMotion());
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });
}
