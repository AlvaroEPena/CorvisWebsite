import type { BUDGETS, SERVICES } from '../lib/contracts/contact';

type Service = (typeof SERVICES)[number];
type Budget = (typeof BUDGETS)[number];

/** Labels for the contract enums; `satisfies` makes the compiler flag any missing value. */
const serviceLabels = {
  redesign: 'Website redesign',
  'new-build': 'Done-for-you new website',
  'care-plan': 'Managed infrastructure',
  'not-sure': 'Not sure yet',
} satisfies Record<Service, string>;

const budgetLabels = {
  'under-3k': 'Under $3,000',
  '3k-6k': '$3,000 to $6,000',
  '6k-12k': '$6,000 to $12,000',
  '12k-plus': '$12,000 and up',
  'not-sure': 'Not sure yet',
} satisfies Record<Budget, string>;

const toOptions = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

export const serviceOptions = toOptions(serviceLabels);
export const budgetOptions = toOptions(budgetLabels);
