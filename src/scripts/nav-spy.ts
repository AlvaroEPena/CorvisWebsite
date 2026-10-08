import { buildOwnerMap, pickActive, sectionIdOf } from './nav-spy-math';

/**
 * Highlights the navbar link of the section being read. A soft glass pill glides behind the active
 * link (transform and width only, set through CSS variables on the list) and the link gets
 * `aria-current="location"`. On other pages the pill rests under the current page's link.
 */
const list = document.querySelector<HTMLElement>('[data-nav-links]');
const links = list ? [...list.querySelectorAll<HTMLAnchorElement>('a')] : [];
const menuLinks = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav-menu] a')];

const hrefOf = (link: HTMLAnchorElement) => link.getAttribute('href') ?? '';

function placePill(link: HTMLElement | undefined): void {
  if (!list) return;
  if (!link) {
    list.removeAttribute('data-active');
    return;
  }
  // Measured against the list itself (a link's offsetLeft is relative to its own list item).
  const box = link.getBoundingClientRect();
  const listBox = list.getBoundingClientRect();
  list.style.setProperty('--ind-x', `${(box.left - listBox.left).toFixed(2)}px`);
  list.style.setProperty('--ind-w', `${box.width.toFixed(2)}px`);
  list.setAttribute('data-active', '');
}

const pageLink = links.find((link) => link.getAttribute('aria-current') === 'page');
const anchorLinks = links.filter((link) => sectionIdOf(hrefOf(link)) !== undefined);

let activeId: string | undefined;

function setActive(id: string | undefined): void {
  activeId = id;
  for (const link of [...links, ...menuLinks]) {
    const isActive = id !== undefined && sectionIdOf(hrefOf(link)) === id;
    if (isActive) link.setAttribute('aria-current', 'location');
    else if (link.getAttribute('aria-current') === 'location') link.removeAttribute('aria-current');
  }
  placePill(anchorLinks.find((link) => sectionIdOf(hrefOf(link)) === id));
}

function refreshPill(): void {
  placePill(anchorLinks.find((link) => sectionIdOf(hrefOf(link)) === activeId) ?? pageLink);
}

if (list && links.length > 0) {
  // Start in place with no glide, then switch the transition on for the next frame.
  refreshPill();
  requestAnimationFrame(() => list.setAttribute('data-ready', ''));

  new ResizeObserver(refreshPill).observe(list);
  void document.fonts?.ready.then(refreshPill);

  if (anchorLinks.length > 0) {
    const owners = buildOwnerMap(anchorLinks.map((link) => sectionIdOf(hrefOf(link)) ?? ''));
    const sections = [...owners.keys()]
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    const crossing = new Map<string, number>();
    /** After a nav click the pill goes straight to the target instead of gliding through every section on the way. */
    let lockUntil = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.set(entry.target.id, entry.boundingClientRect.top);
          else crossing.delete(entry.target.id);
        }
        if (performance.now() < lockUntil) return;
        setActive(
          pickActive(
            [...crossing].map(([id, top]) => ({ id, top })),
            owners,
          ),
        );
      },
      // A thin reading line about a third of the way down the screen.
      { rootMargin: '-34% 0px -62% 0px' },
    );
    sections.forEach((section) => observer.observe(section));

    const onNavigate = (event: Event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      const id = anchor ? sectionIdOf(hrefOf(anchor)) : undefined;
      const owner = id ? owners.get(id) : undefined;
      if (!owner) return;
      lockUntil = performance.now() + 1100;
      setActive(owner);
    };
    list.addEventListener('click', onNavigate);
    document.querySelector('[data-nav-menu]')?.addEventListener('click', onNavigate);
  }
}
