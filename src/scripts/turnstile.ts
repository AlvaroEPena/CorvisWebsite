/** Minimal typed wrapper around Cloudflare Turnstile's explicit-render API. */

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: 'light' | 'dark' | 'auto';
      size?: 'normal' | 'flexible' | 'compact';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ): string;
  reset(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<TurnstileApi> | undefined;

function loadScript(): Promise<TurnstileApi> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('no api'));
    script.onerror = () => {
      scriptPromise = undefined; // allow a retry on the next attempt
      reject(new Error('Turnstile failed to load'));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  reset(): void;
}

interface MountOptions {
  siteKey: string;
  onToken(token: string): void;
  onInvalid(): void;
}

/** Loads the script (once) and renders the widget into `container`. */
export async function mountTurnstile(
  container: HTMLElement,
  { siteKey, onToken, onInvalid }: MountOptions,
): Promise<TurnstileHandle> {
  const api = await loadScript();
  const widgetId = api.render(container, {
    sitekey: siteKey,
    theme: 'light',
    size: 'flexible',
    callback: onToken,
    'expired-callback': onInvalid,
    'error-callback': onInvalid,
  });
  return {
    reset() {
      onInvalid();
      api.reset(widgetId);
    },
  };
}
