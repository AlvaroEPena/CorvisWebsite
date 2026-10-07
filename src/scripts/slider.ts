import { beforeClipPath, describePosition, toPercent } from './slider-math';

/** Wires every `[data-ba]` slider: a native range input drives the clip of the "before" layer. */
function initSlider(root: HTMLElement): void {
  const input = root.querySelector<HTMLInputElement>('[data-ba-input]');
  const before = root.querySelector<HTMLElement>('[data-ba-before]');
  if (!input || !before) return;

  const update = () => {
    const percent = toPercent(input.value);
    before.style.clipPath = beforeClipPath(percent);
    root.style.setProperty('--ba-pos', `${percent}%`);
    input.setAttribute('aria-valuetext', describePosition(percent));
  };

  input.addEventListener('input', update);
  update();
}

document.querySelectorAll<HTMLElement>('[data-ba]').forEach(initSlider);
