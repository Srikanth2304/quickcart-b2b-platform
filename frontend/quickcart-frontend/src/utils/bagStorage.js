import { showToast } from "./notify";

const BAG_KEY = "retailer-bag";
const MAX_QTY = 100;   // max per item
const MAX_ITEMS = 50;   // max unique items in bag

function clampQty(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.round(n), MAX_QTY);
}

/** Validate that an item has the minimum required shape. */
function isValidItem(item) {
  return item && (typeof item.id === "number" || typeof item.id === "string") && item.id !== "";
}

export function getBagItems() {
  try {
    const raw = localStorage.getItem(BAG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isValidItem)
      .map((item) => ({
        ...item,
        quantity: clampQty(item.quantity),
      }));
  } catch {
    return [];
  }
}

export function saveBagItems(items) {
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("retailer-bag-changed"));
  } catch (error) {
    if (error?.name === "QuotaExceededError" || error?.code === 22) {
      showToast("Storage is full. Please remove some items.", "error");
    }
  }
}

export function addToBag(product, quantity = 1) {
  if (!isValidItem(product)) return;
  const items = getBagItems();
  const nextQty = clampQty(quantity);
  const existingIndex = items.findIndex((item) => item?.id === product.id);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    items[existingIndex] = {
      ...existing,
      ...product,
      quantity: Math.min(MAX_QTY, clampQty(existing.quantity) + nextQty),
    };
  } else {
    if (items.length >= MAX_ITEMS) {
      showToast(`Cart is full (max ${MAX_ITEMS} items). Remove something first.`, "info");
      return;
    }
    items.push({ ...product, quantity: nextQty });
  }

  saveBagItems(items);
}

export function updateBagItemQuantity(id, quantity) {
  const items = getBagItems();
  const next = items
    .map((item) => {
      if (item?.id !== id) return item;
      return { ...item, quantity: clampQty(quantity) };
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
  return getBagItems().reduce((sum, item) => sum + clampQty(item.quantity), 0);
}
