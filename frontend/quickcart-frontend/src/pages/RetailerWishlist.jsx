import { useEffect, useMemo, useState } from "react";
import { addToBag } from "../utils/bagStorage";
import { showToast } from "../utils/notify";
import "./RetailerWishlist.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString();
}

function getStoredWishlist() {
  try {
    const raw = localStorage.getItem("retailer-wishlist");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveWishlist(items) {
  try {
    localStorage.setItem("retailer-wishlist", JSON.stringify(items));
  } catch (error) {
    // ignore
  }
}

export default function RetailerWishlist() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(getStoredWishlist());
  }, []);

  const itemCount = items.length;

  const handleRemove = (id) => {
    setItems((prev) => {
      const next = prev.filter((item) => item?.id !== id);
      saveWishlist(next);
      return next;
    });
  };

  const handleMoveToBag = (product) => {
    if (!product?.id) return;
    addToBag(product, 1);
    handleRemove(product.id);
    showToast("Added to cart", "success");
  };

  const cards = useMemo(() => {
    return items.map((product) => {
      const price = product?.price ?? product?.sellingPrice ?? product?.salePrice;
      const mrp = product?.mrp ?? product?.originalPrice ?? product?.listPrice ?? product?.price;
      const discountPercent =
        mrp && price && Number(mrp) > Number(price)
          ? Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100)
          : null;

      return (
        <div key={product.id} className="wishlist-card">
          <button
            type="button"
            className="wishlist-remove"
            aria-label="Remove from favorites"
            onClick={() => handleRemove(product.id)}
          >
            ×
          </button>
          <a
            className="wishlist-link"
            href={`/retailer/products/${product.id}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              try {
                sessionStorage.setItem(
                  `retailer-product-${product.id}`,
                  JSON.stringify(product)
                );
              } catch (storageError) {
                // ignore
              }
            }}
          >
            <div className="wishlist-image">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name || "Product"} />
              ) : (
                <div className="wishlist-image-placeholder">
                  <span>{product.name?.charAt(0) || "P"}</span>
                </div>
              )}
            </div>
            <div className="wishlist-body">
              <div className="wishlist-name">{product.name}</div>
              <div className="wishlist-price-row">
                <span className="wishlist-price">Rs.{formatCurrency(price)}</span>
                {mrp && (
                  <span className="wishlist-mrp">Rs.{formatCurrency(mrp)}</span>
                )}
                {Number.isFinite(discountPercent) && (
                  <span className="wishlist-discount">({discountPercent}% OFF)</span>
                )}
              </div>
            </div>
          </a>
          <button
            type="button"
            className="wishlist-move"
            onClick={() => handleMoveToBag(product)}
          >
            MOVE TO CART
          </button>
        </div>
      );
    });
  }, [items]);

  return (
    <div className="retailer-wishlist-page">
      <div className="retailer-wishlist-header">
        <h2>My Favorites</h2>
        <span>{itemCount} items</span>
      </div>

      {itemCount === 0 ? (
        <div className="retailer-wishlist-empty">Your favorites are empty.</div>
      ) : (
        <div className="retailer-wishlist-grid">{cards}</div>
      )}
    </div>
  );
}
