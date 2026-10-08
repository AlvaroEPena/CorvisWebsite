import { DEPOSIT_PACKAGES, type DepositPackageId } from '../lib/contracts/checkout';

export interface Deposit {
  id: DepositPackageId;
  /** Whole USD, derived from the contract so the label can never drift from what Stripe charges. */
  amountUsd: number;
  /** Placeholder figure until the owner confirms real pricing. */
  placeholder: true;
}

const isDepositPackage = (id: string): id is DepositPackageId => id in DEPOSIT_PACKAGES;

/** Deposit for a pricing package id, or undefined when the package has no checkout (e.g. care). */
export function depositFor(packageId: string): Deposit | undefined {
  if (!isDepositPackage(packageId)) return undefined;
  return {
    id: packageId,
    amountUsd: DEPOSIT_PACKAGES[packageId].depositUsdCents / 100,
    placeholder: true,
  };
}
