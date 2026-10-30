const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "2799" becomes "2,799". Prices show as plain numbers site-wide, and always derive from the data. */
export function formatPrice(amount: number): string {
  return plain.format(amount);
}
