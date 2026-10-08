import CMS from '@sveltia/cms';
import type { CustomFieldControlProps } from '@sveltia/cms';

import { HOME_MEMBERSHIP_WIDGET, removalMessage } from './reviews-fields';

/**
 * The "Remove from home screen" button in the Home reviews editor.
 *
 * It is a custom field type bound to the `featured` field, so it changes the SAME record that the
 * "Show on the home page" tick box in All reviews changes. A custom control can only change its own
 * field, so the review's old `homeOrder` number stays in the file; it is ignored while `featured` is
 * false, and puts the review back in its old slot if it is ticked again later.
 */
const { createElement: h } = CMS.React;

function HomeMembershipControl({ value, onChange, entry, forID }: CustomFieldControlProps) {
  const isOnHomeScreen = value !== false;
  const name = String(entry?.getIn(['data', 'name']) ?? '');

  const remove = () => {
    // A native dialog: keyboard and screen reader friendly, and impossible to dismiss by accident.
    if (window.confirm(removalMessage(name))) onChange(false);
  };

  return h(
    'div',
    { id: forID, style: { display: 'grid', gap: '0.6rem', justifyItems: 'start' } },
    h(
      'p',
      { style: { margin: 0 }, role: 'status' },
      isOnHomeScreen
        ? 'This review is on the home screen.'
        : 'This review will leave the home screen when you press Save.',
    ),
    isOnHomeScreen
      ? h(
          'button',
          { type: 'button', onClick: remove, style: buttonStyle(true) },
          'Remove from home screen',
        )
      : h(
          'button',
          { type: 'button', onClick: () => onChange(true), style: buttonStyle(false) },
          'Undo',
        ),
  );
}

function buttonStyle(isDanger: boolean) {
  return {
    padding: '0.45rem 0.9rem',
    borderRadius: '6px',
    border: `1px solid ${isDanger ? '#b3261e' : 'currentColor'}`,
    background: 'transparent',
    color: isDanger ? '#b3261e' : 'inherit',
    font: 'inherit',
    fontWeight: 600,
    cursor: 'pointer',
  } as const;
}

export function registerHomeMembershipWidget(): void {
  CMS.registerWidget(HOME_MEMBERSHIP_WIDGET, HomeMembershipControl);
}
