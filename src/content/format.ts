const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** "5800" becomes "$5,800". Display prices always derive from the data, never typed twice. */
export function formatPrice(amount: number): string {
  return usd.format(amount);
}
