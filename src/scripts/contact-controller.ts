import { contactInputSchema, type ContactResponse } from '../lib/contracts/contact';
import {
  buildContactPayload,
  describeFailure,
  fieldErrorsFromIssues,
  firstInvalidField,
  parseContactResponse,
  splitSubmitErrors,
  type FieldErrors,
} from './contact-form';
import { mountTurnstile, type TurnstileHandle } from './turnstile';

const ENDPOINT = '/api/contact';

/** Wires validation, Turnstile, submission and the success/failure states for one form. */
export function initContactForm(form: HTMLFormElement, startedAt: number): void {
  const email = form.dataset.contactEmail ?? '';
  const submit = must<HTMLButtonElement>(form, '[data-submit]');
  const submitLabel = submit.textContent ?? '';
  const status = must<HTMLElement>(form, '[data-form-error]');
  const success = must<HTMLElement>(document, '[data-form-success]');
  const widget = must<HTMLElement>(form, '[data-turnstile]');

  let token = '';
  let check: TurnstileHandle | undefined;
  let isSending = false;

  void mountTurnstile(widget, {
    siteKey: widget.dataset.sitekey ?? '',
    onToken: (value) => {
      token = value;
      setFieldError('turnstileToken', undefined);
    },
    onInvalid: () => {
      token = '';
    },
  })
    .then((handle) => (check = handle))
    .catch(() =>
      showStatus('The security check could not load. Refresh the page or email ' + email + '.'),
    );

  /** Field elements are looked up by `name`; the check widget has no input of its own. */
  function fieldElement(field: string): HTMLElement | null {
    return field === 'turnstileToken'
      ? widget
      : form.querySelector<HTMLElement>(`[name="${field}"]`);
  }

  function setFieldError(field: string, message: string | undefined): void {
    const holder = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    const control = fieldElement(field);
    if (!holder || !control) return;
    holder.textContent = message ?? '';
    holder.hidden = !message;
    if (field === 'turnstileToken') return;
    const hint = control.dataset.describedby ?? '';
    if (message) {
      control.setAttribute('aria-invalid', 'true');
      control.setAttribute('aria-describedby', `${hint} ${holder.id}`.trim());
    } else {
      control.removeAttribute('aria-invalid');
      if (hint) control.setAttribute('aria-describedby', hint);
      else control.removeAttribute('aria-describedby');
    }
  }

  function showErrors(errors: FieldErrors): void {
    form.querySelectorAll<HTMLElement>('[data-error-for]').forEach((holder) => {
      const field = holder.dataset.errorFor ?? '';
      setFieldError(field, errors[field]);
    });
    const first = firstInvalidField(errors);
    if (!first) return;
    const target = fieldElement(first);
    if (target && first === 'turnstileToken') target.tabIndex = -1;
    target?.focus();
  }

  function showStatus(message: string): void {
    status.hidden = !message;
    status.textContent = message;
  }

  function setSending(value: boolean): void {
    isSending = value;
    submit.disabled = value;
    submit.dataset.loading = String(value);
    submit.textContent = value ? 'Sending…' : submitLabel;
  }

  function fail(response: ContactResponse | null): void {
    const view = describeFailure(response, email);
    showErrors(view.fieldErrors);
    showStatus(view.message);
    if (view.resetCheck) check?.reset();
    if (Object.keys(view.fieldErrors).length === 0) {
      status.tabIndex = -1;
      status.focus();
    }
  }

  async function send(payload: unknown): Promise<void> {
    setSending(true);
    try {
      const reply = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await reply.json().catch(() => null);
      const outcome = parseContactResponse(body, reply.status);
      if (outcome?.ok) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
        return;
      }
      fail(outcome);
    } catch {
      fail(null);
    } finally {
      setSending(false);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSending) return;
    showStatus('');

    const payload = buildContactPayload(new FormData(form), token, performance.now() - startedAt);
    const result = contactInputSchema.safeParse(payload);
    if (result.success) {
      showErrors({});
      void send(result.data);
      return;
    }

    const errors = fieldErrorsFromIssues(result.error.issues);
    const { fieldErrors, isTooFast } = splitSubmitErrors(errors);
    showErrors(fieldErrors);
    if (isTooFast) fail({ ok: false, error: 'too_fast' });
  });
}

function must<T extends Element>(scope: ParentNode, selector: string): T {
  const element = scope.querySelector<T>(selector);
  if (!element) throw new Error(`Contact form is missing ${selector}`);
  return element;
}
