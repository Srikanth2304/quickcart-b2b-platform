import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import "./RetailerProductDetails.css";

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString();
}

function extractImageUrl(image) {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.url || image.imageUrl || image.src || image.path || null;
}

export default function RetailerProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchProduct = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/products/${id}`);
        if (!isMounted) return;
        setProduct(response.data || null);
      } catch (err) {
        if (!isMounted) return;
        try {
          const cached = sessionStorage.getItem(`retailer-product-${id}`);
          if (cached) {
            setProduct(JSON.parse(cached));
            return;
          }
        } catch (storageError) {
          // ignore
        }
        setError("Failed to load product details. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (id) fetchProduct();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const imageUrls = useMemo(() => {
    if (!product) return [];
    const rawImages =
      product.images ||
      product.imageUrls ||
      product.gallery ||
      product.media ||
      [];
    const list = Array.isArray(rawImages) ? rawImages : [rawImages];

    const extra = [
      product.image,
      product.imageUrl,
      product.thumbnail,
      product.thumbnailUrl,
    ].filter(Boolean);
    const urls = [...list, ...extra]
      .map(extractImageUrl)
      .filter(Boolean);

    return Array.from(new Set(urls));
  }, [product]);

  useEffect(() => {
    setActiveImage(0);
  }, [imageUrls.length]);

  const price = product?.discountPrice ?? product?.price ?? product?.sellingPrice ?? product?.salePrice;
  const mrp = product?.mrp ?? product?.originalPrice ?? product?.listPrice ?? product?.price ?? price;
  const discountPercent =
    mrp && price && Number(mrp) > Number(price)
      ? Math.round(((Number(mrp) - Number(price)) / Number(mrp)) * 100)
      : 0;
  const ratingValue = Number(product?.rating || 0).toFixed(1);
  const ratingCount = product?.reviewCount ?? 0;

  return (
    <div className="retailer-product-details-page">
      {loading && <div className="retailer-product-details-state">Loading product...</div>}
      {error && !product && <div className="retailer-product-details-error">{error}</div>}

      {!loading && !error && product && (
        <div className="retailer-product-details">
          <div className="retailer-product-breadcrumb">
            Home / Products / <span>{product.category?.name || "Retailer Products"}</span>
          </div>

          <div className="retailer-product-details-grid">
            <div className="retailer-product-gallery">
              <div className="retailer-product-thumbs">
                {imageUrls.length > 0 ? (
                  imageUrls.map((url, index) => (
                    <button
                      key={`${url}-${index}`}
                      type="button"
                      className={`retailer-product-thumb ${index === activeImage ? "active" : ""}`}
                      onMouseEnter={() => setActiveImage(index)}
                      onFocus={() => setActiveImage(index)}
                    >
                      <img src={url} alt={`${product.name} thumbnail ${index + 1}`} />
                    </button>
                  ))
                ) : (
                  <div className="retailer-product-thumb placeholder">
                    <span>{product.name?.charAt(0) || "P"}</span>
                  </div>
                )}
              </div>

              <div className="retailer-product-main-image">
                {imageUrls.length > 0 ? (
                  <img src={imageUrls[activeImage]} alt={product.name} />
                ) : (
                  <div className="retailer-product-main-placeholder">
                    <span>{product.name?.charAt(0) || "P"}</span>
                  </div>
                )}
                <button className="retailer-product-favorite" type="button" aria-label="Wishlist">
                  ♥
                </button>
              </div>
            </div>

            <div className="retailer-product-info">
              <div className="retailer-product-brand">{product.brand || "Brand"}</div>
              <h1 className="retailer-product-title">{product.name}</h1>
              <div className="retailer-product-subtitle">{product.shortDescription || product.description}</div>

              <div className="retailer-product-price-block">
                <span className="retailer-product-price">₹{formatCurrency(price)}</span>
                {mrp && (
                  <span className="retailer-product-mrp">₹{formatCurrency(mrp)}</span>
                )}
                {discountPercent > 0 && (
                  <span className="retailer-product-discount">{discountPercent}% off</span>
                )}
              </div>

              <div className="retailer-product-rating">
                <span className="retailer-product-rating-value">{ratingValue}★</span>
                <span className="retailer-product-rating-meta">
                  {ratingCount} ratings
                </span>
              </div>

              <div className="retailer-product-actions">
                <button className="retailer-product-action add">Add to Cart</button>
                <button className="retailer-product-action buy">Buy Now</button>
              </div>

              <div className="retailer-product-section">
                <div className="retailer-product-section-title">Available offers</div>
                <ul>
                  <li>Bank Offer: 5% cashback on select bank cards.</li>
                  <li>Special Price: Extra ₹10 off on 20 items.</li>
                  <li>Free delivery in select locations.</li>
                </ul>
              </div>

              <div className="retailer-product-section">
                <div className="retailer-product-section-title">Delivery</div>
                <div className="retailer-product-delivery">
                  <span>Deliver to</span>
                  <input type="text" defaultValue="Chennai - 600130" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
