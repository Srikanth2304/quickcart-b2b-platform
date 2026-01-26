const BAG_KEY = "retailer-bag";

export function getBagItems() {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({
        ...item,
        quantity: Number.isFinite(Number(item?.quantity))
          ? Math.max(1, Number(item.quantity))
          : 1,
      }))
      .filter((item) => item?.id);
  } catch (error) {
    return [];
  }
}

export function saveBagItems(items) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("retailer-bag-changed"));
  } catch (error) {
    // ignore
  }
}

export function addToBag(product, quantity = 1) {
  if (!product?.id) return;
  const items = getBagItems();
  const nextQty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
  const existingIndex = items.findIndex((item) => item?.id === product.id);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      ...product,
      quantity: Math.max(1, Number(existing.quantity || 1) + nextQty),
    };
  } else {
    items.push({ ...product, quantity: Math.max(1, nextQty) });
  }

  saveBagItems(items);
}

export function updateBagItemQuantity(id, quantity) {
  const items = getBagItems();
  const next = items
    .map((item) => {
      if (item?.id !== id) return item;
      const safeQty = Number.isFinite(Number(quantity)) ? Number(quantity) : 1;
      return { ...item, quantity: Math.max(1, safeQty) };
    })
    .filter(Boolean);
  saveBagItems(next);
}

export function removeFromBag(id) {
  const items = getBagItems();
  const next = items.filter((item) => item?.id !== id);
  saveBagItems(next);
}

export function getBagCount() {
  return getBagItems().reduce((sum, item) => sum + Number(item?.quantity || 1), 0);
}
