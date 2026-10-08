import { ProductVariant } from '../inventory.models';

/** One entry of an item picker: a variant, labelled "SKU — name", carrying its product id and default prices. */
export interface ItemOption {
  value: number;
  label: string;
  product: number;
  price: string | null;
  cost: string | null;
}

/** Sales orders, returns and supplier returns pick items by variant; every product has at least a default one. */
export function toItemOption(variant: ProductVariant): ItemOption {
  const name = variant.name || variant.product?.name || '';
  return {
    value: variant.id,
    label: `${variant.sku} — ${name}`,
    product: variant.product?.id,
    price: variant.standard_price,
    cost: variant.standard_cost,
  };
}

/** "12.5000" → "12.5" so inputs show what the user would type. */
export function trimZeros(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value;
}
