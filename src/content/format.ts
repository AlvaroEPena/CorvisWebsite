const plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "1874" becomes "1,874". Prices show as plain numbers site-wide, and always derive from the data. */
export function formatPrice(amount: number): string {
  return plain.format(amount);
}
