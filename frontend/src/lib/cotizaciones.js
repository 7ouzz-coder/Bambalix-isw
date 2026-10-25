export function getQuotePreview(items) {
  const subtotals = items.map((item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice);
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100000 ||
      price < 0 ||
      price > 999999999.99 ||
      !/^\d+(\.\d{1,2})?$/.test(String(price))
    )
      return null;

    const cents = Math.round(price * 100) * quantity;
    return Number.isSafeInteger(cents) ? cents : null;
  });
  const totalCents = subtotals.reduce((sum, value) => sum + (value ?? 0), 0);
  return {
    subtotals: subtotals.map((value) => (value === null ? null : value / 100)),
    total:
      subtotals.includes(null) || !Number.isSafeInteger(totalCents)
        ? null
        : totalCents / 100,
  };
}
