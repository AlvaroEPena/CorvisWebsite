/**
 * Entry for the contact form. Stays tiny: the validation schema (Zod) and the Turnstile widget are
 * only loaded when the form is about to scroll into view or the visitor touches it.
 */
const form = document.querySelector<HTMLFormElement>('[data-contact-form]');

if (form) {
  // performance.now() already counts from navigation start, which is when the form was rendered.
  // Measuring from this module's own start would undercount whenever the script loads late.
  const startedAt = 0;
  let started = false;

  // Never let a native submit leak personal data into a URL before the real handler is attached.
  const blockEarlySubmit = (event: Event) => {
    event.preventDefault();
    void start();
  };

  async function start(): Promise<void> {
    if (started || !form) return;
    started = true;
    observer.disconnect();
    const { initContactForm } = await import('./contact-controller');
    form.removeEventListener('submit', blockEarlySubmit);
    initContactForm(form, startedAt);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void start();
    },
    { rootMargin: '600px 0px' },
  );

  form.addEventListener('submit', blockEarlySubmit);
  form.addEventListener('focusin', () => void start(), { once: true });
  observer.observe(form);
}
