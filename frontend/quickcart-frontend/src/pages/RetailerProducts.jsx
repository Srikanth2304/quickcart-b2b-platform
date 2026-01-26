import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { showToast } from "../utils/notify";
import "./RetailerProducts.css";

export default function RetailerProducts() {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wishlist, setWishlist] = useState(() => new Set());
  const [sortBy, setSortBy] = useState("recommended");
  const [selectedCategories, setSelectedCategories] = useState(() => new Set());
  const [selectedBrands, setSelectedBrands] = useState(() => new Set());
  const [selectedPrices, setSelectedPrices] = useState(() => new Set());
  const [selectedDiscounts, setSelectedDiscounts] = useState(() => new Set());
  const [selectedRatings, setSelectedRatings] = useState(() => new Set());
  const [availability, setAvailability] = useState({ inStock: false, outOfStock: false });
  const [priceRangeMax, setPriceRangeMax] = useState(10000);
  const [appliedPriceMax, setAppliedPriceMax] = useState(null);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryBrandMap, setCategoryBrandMap] = useState(() => new Map());
  const [facetsLoading, setFacetsLoading] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    category: true,
    brand: true,
    price: true,
    ratings: true,
    availability: true,
    discount: true,
  });
  const pageSize = 12;
  const PRICE_MIN = 100;
  const PRICE_MAX = 10000;

  const stopPropagation = (event) => event.stopPropagation();
  const toggleSection = (key) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const getStoredWishlist = () => {
    try {
      const raw = localStorage.getItem("retailer-wishlist");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const saveWishlist = (items) => {
    try {
      localStorage.setItem("retailer-wishlist", JSON.stringify(items));
    } catch (error) {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const items = getStoredWishlist();
    setWishlist(new Set(items.map((item) => item?.id).filter(Boolean)));
  }, []);

  useEffect(() => {
    setPage(0);
  }, [
    selectedCategories,
    selectedBrands,
    selectedPrices,
    selectedDiscounts,
    selectedRatings,
    availability,
    appliedPriceMax,
    sortBy,
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          page,
          size: pageSize,
        };

        if (selectedCategories.size > 0) {
          params.category = Array.from(selectedCategories).join(",");
        }

        if (selectedBrands.size > 0) {
          params.brand = Array.from(selectedBrands).join(",");
        }

        if (selectedPrices.size > 0) {
          const ranges = Array.from(selectedPrices).map((range) => {
            if (range === "under-1000") return { min: 0, max: 1000 };
            if (range === "1000-3000") return { min: 1000, max: 3000 };
            if (range === "3000-5000") return { min: 3000, max: 5000 };
            if (range === "5000+") return { min: 5000, max: null };
            return { min: null, max: null };
          });

          const minValues = ranges.map((range) => range.min).filter((value) => value !== null);
          const maxValues = ranges.map((range) => range.max).filter((value) => value !== null);

          if (minValues.length > 0) params.minPrice = Math.min(...minValues);
          if (maxValues.length > 0 && !ranges.some((range) => range.max === null)) {
            params.maxPrice = Math.max(...maxValues);
          }
        }

        if (appliedPriceMax !== null) {
          params.maxPrice = params.maxPrice
            ? Math.min(params.maxPrice, appliedPriceMax)
            : appliedPriceMax;
        }

        if (selectedRatings.size > 0) {
          const ratingValues = Array.from(selectedRatings).map((value) => Number(value));
          params.rating = Math.min(...ratingValues);
        }

        if (availability.inStock !== availability.outOfStock) {
          params.inStock = availability.inStock;
        }

        if (sortBy === "priceLow") params.sort = "price,asc";
        if (sortBy === "priceHigh") params.sort = "price,desc";
        if (sortBy === "rating") params.sort = "rating,desc";
        if (sortBy === "newest") params.sort = "createdAt,desc";

        const response = await api.get("/products", { params });
        if (!isMounted) return;
        const data = response.data || {};
        const content = data.content || [];
        setProducts(content);
        setTotalPages(data.totalPages || 1);
        setTotalElements(data.totalElements || 0);

        const nextCategoryCounts = new Map();
        const nextBrandCounts = new Map();
        const nextCategoryBrandMap = new Map();

        content.forEach((product) => {
          const categoryName = product?.category?.name;
          const categorySlug = product?.category?.slug;
          if (categoryName && categorySlug) {
            nextCategoryCounts.set(categorySlug, {
              name: categoryName,
              slug: categorySlug,
              count: (nextCategoryCounts.get(categorySlug)?.count || 0) + 1,
            });
          }

          const brandName = product?.brand;
          if (brandName) {
            nextBrandCounts.set(brandName, {
              name: brandName,
              count: (nextBrandCounts.get(brandName)?.count || 0) + 1,
            });
          }

          if (categorySlug && brandName) {
            if (!nextCategoryBrandMap.has(categorySlug)) {
              nextCategoryBrandMap.set(categorySlug, new Set());
            }
            nextCategoryBrandMap.get(categorySlug).add(brandName);
          }
        });

        setCategoryBrandMap((prev) => {
          if (prev.size === 0) return nextCategoryBrandMap;
          const merged = new Map(prev);
          nextCategoryBrandMap.forEach((brandSet, slug) => {
            if (!merged.has(slug)) {
              merged.set(slug, brandSet);
              return;
            }
            const existing = merged.get(slug);
            brandSet.forEach((brand) => existing.add(brand));
          });
          return merged;
        });
      } catch (err) {
        if (!isMounted) return;
        setError("Failed to load products. Please try again.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      isMounted = false;
    };
  }, [
    page,
    selectedCategories,
    selectedBrands,
    selectedPrices,
    selectedRatings,
    selectedDiscounts,
    availability,
    appliedPriceMax,
    sortBy,
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchFacets = async () => {
      setFacetsLoading(true);
      try {
        const params = {};

        if (selectedCategories.size > 0) {
          params.category = Array.from(selectedCategories).join(",");
        }

        if (selectedBrands.size > 0) {
          params.brand = Array.from(selectedBrands).join(",");
        }

        if (selectedPrices.size > 0) {
          const ranges = Array.from(selectedPrices).map((range) => {
            if (range === "under-1000") return { min: 0, max: 1000 };
            if (range === "1000-3000") return { min: 1000, max: 3000 };
            if (range === "3000-5000") return { min: 3000, max: 5000 };
            if (range === "5000+") return { min: 5000, max: null };
            return { min: null, max: null };
          });

          const minValues = ranges.map((range) => range.min).filter((value) => value !== null);
          const maxValues = ranges.map((range) => range.max).filter((value) => value !== null);

          if (minValues.length > 0) params.minPrice = Math.min(...minValues);
          if (maxValues.length > 0 && !ranges.some((range) => range.max === null)) {
            params.maxPrice = Math.max(...maxValues);
          }
        }

        if (appliedPriceMax !== null) {
          params.maxPrice = params.maxPrice
            ? Math.min(params.maxPrice, appliedPriceMax)
            : appliedPriceMax;
        }

        if (selectedRatings.size > 0) {
          const ratingValues = Array.from(selectedRatings).map((value) => Number(value));
          params.rating = Math.min(...ratingValues);
        }

        if (availability.inStock !== availability.outOfStock) {
          params.inStock = availability.inStock;
        }

        const response = await api.get("/products/facets", { params });
        if (!isMounted) return;
        const facets = response.data || {};
        const rawCategories = Array.isArray(facets.categories) ? facets.categories : [];
        const rawBrands = Array.isArray(facets.brands) ? facets.brands : [];

        const normalizedCategories = rawCategories
          .map((item) => {
            if (typeof item === "string") {
              return { name: item, slug: item, count: 0 };
            }
            const name = item?.name ?? item?.categoryName ?? item?.label;
            const slug = item?.slug ?? item?.categorySlug ?? item?.value ?? name;
            const count = Number(item?.count ?? item?.total ?? 0);
            if (!name || !slug) return null;
            return { name, slug, count };
          })
          .filter(Boolean);

        const normalizedBrands = rawBrands
          .map((item) => {
            if (typeof item === "string") {
              return { name: item, count: 0 };
            }
            const name = item?.name ?? item?.brandName ?? item?.label ?? item?.value;
            const count = Number(item?.count ?? item?.total ?? 0);
            if (!name) return null;
            return { name, count };
          })
          .filter(Boolean);

        setCategoryOptions(normalizedCategories);
        setBrandOptions(normalizedBrands);
      } catch (err) {
        if (!isMounted) return;
      } finally {
        if (isMounted) setFacetsLoading(false);
      }
    };

    fetchFacets();
    return () => {
      isMounted = false;
    };
  }, [selectedCategories, selectedBrands, selectedPrices, selectedRatings, availability, appliedPriceMax]);

  const pageInfo = useMemo(() => {
    const start = page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalElements || 0);
    return totalElements > 0 ? `${start}-${end} of ${totalElements} items` : "0 items";
  }, [page, pageSize, totalElements]);

  const brandCounts = useMemo(() => {
    const options = brandOptions.map((option) => [option.name, option.count]);
    if (selectedCategories.size === 0) return options;

    const allowed = new Set();
    selectedCategories.forEach((slug) => {
      const brands = categoryBrandMap.get(slug);
      if (brands) brands.forEach((brand) => allowed.add(brand));
    });

    return options.filter(([name]) => allowed.has(name));
  }, [brandOptions, categoryBrandMap, selectedCategories]);

  const sortedBrandCounts = useMemo(() => {
    const list = [...brandCounts];
    return list.sort((a, b) => {
      const countDiff = Number(b[1] ?? 0) - Number(a[1] ?? 0);
      if (countDiff !== 0) return countDiff;
      return String(a[0]).localeCompare(String(b[0]));
    });
  }, [brandCounts]);

  const topBrandCounts = useMemo(() => sortedBrandCounts.slice(0, 10), [sortedBrandCounts]);
  const remainingBrandCount = Math.max(sortedBrandCounts.length - topBrandCounts.length, 0);

  const brandAlphabet = useMemo(
    () => ["#", ...Array.from({ length: 26 }, (_, idx) => String.fromCharCode(65 + idx))],
    []
  );

  const modalBrandCounts = useMemo(() => {
    const query = brandSearch.trim().toLowerCase();
    if (!query) return sortedBrandCounts;
    return sortedBrandCounts.filter(([name]) => String(name).toLowerCase().includes(query));
  }, [brandSearch, sortedBrandCounts]);

  const brandGroups = useMemo(() => {
    const groups = new Map();
    modalBrandCounts.forEach(([name, count]) => {
      const firstChar = String(name).trim().charAt(0).toUpperCase();
      const key = firstChar >= "A" && firstChar <= "Z" ? firstChar : "#";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push([name, count]);
    });

    return brandAlphabet
      .filter((key) => groups.has(key))
      .map((key) => ({ key, items: groups.get(key) }));
  }, [modalBrandCounts, brandAlphabet]);

  const scrollToBrandGroup = (key) => {
    const el = document.getElementById(`brand-group-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    if (selectedDiscounts.size === 0) return products;

    const percentFilters = Array.from(selectedDiscounts).map((value) => Number(value));
    const minPercent = Math.max(...percentFilters, 0);

    return products.filter((product) => {
      const priceValue = Number(product?.price);
      const mrpValue = Number(product?.mrp);
      if (!Number.isFinite(priceValue) || !Number.isFinite(mrpValue) || mrpValue <= 0) return false;
      const percent = ((mrpValue - priceValue) / mrpValue) * 100;
      return percent >= minPercent;
    });
  }, [products, selectedDiscounts]);

  const sortedProducts = useMemo(() => {
    if (!Array.isArray(filteredProducts)) return [];
    if (sortBy === "recommended" || sortBy === "newest") return filteredProducts;

    const list = [...filteredProducts];
    const getNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
    const getPrice = (product) => getNumber(product?.price ?? product?.sellingPrice ?? product?.salePrice);
    const getRating = (product) => getNumber(product?.rating);

    switch (sortBy) {
      case "priceHigh":
        return list.sort((a, b) => getPrice(b) - getPrice(a));
      case "priceLow":
        return list.sort((a, b) => getPrice(a) - getPrice(b));
      case "rating":
        return list.sort((a, b) => getRating(b) - getRating(a));
      default:
        return list;
    }
  }, [filteredProducts, sortBy]);

  const toggleSetValue = (setter, value) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  const toggleWishlist = (product) => {
    if (!product?.id) return;
    const items = getStoredWishlist();
    const next = new Set(wishlist);
    if (next.has(product.id)) {
      next.delete(product.id);
      saveWishlist(items.filter((item) => item?.id !== product.id));
      showToast("Removed from favorites", "info");
    } else {
      next.add(product.id);
      const filtered = items.filter((item) => item?.id !== product.id);
      saveWishlist([...filtered, product]);
      showToast("Added to favorites", "success");
    }
    setWishlist(next);
  };



  const handleClearAll = () => {
    setSelectedCategories(new Set());
    setSelectedBrands(new Set());
    setSelectedPrices(new Set());
    setSelectedDiscounts(new Set());
    setSelectedRatings(new Set());
    setAvailability({ inStock: false, outOfStock: false });
    setPriceRangeMax(PRICE_MAX);
    setAppliedPriceMax(null);
  };

  const handlePriceChange = (event) => {
    setPriceRangeMax(Number(event.target.value));
  };

  const applyPriceFilter = () => {
    const nextValue = Number(priceRangeMax);
    if (Number.isFinite(nextValue) && nextValue < PRICE_MAX) {
      setAppliedPriceMax(nextValue);
    } else {
      setAppliedPriceMax(null);
    }
  };

  return (
    <>
    <div className="retailer-products-layout">
      <div className="retailer-products-top">
        <div className="retailer-products-breadcrumb">
          <a href="/" className="breadcrumb-link">Home</a> /
          <a href="/retailer/products" className="breadcrumb-link"> Products</a>
        </div>
        <div className="retailer-products-titleRow">
          <h2>Retailer Products</h2>
          <span className="retailer-products-count">{totalElements} items</span>
        </div>
      </div>

      <div className="retailer-products-content">
        <aside className="retailer-products-filters">
          <div className="filters-header">
            <span>Filters</span>
            <button className="filters-clear" type="button" onClick={handleClearAll}>
              CLEAR ALL
            </button>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("category")}
            >
              <span className="filters-title">Category</span>
              <span className={`filters-chevron ${expandedSections.category ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.category ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              {facetsLoading ? (
                <div className="filters-empty">Loading...</div>
              ) : categoryOptions.length === 0 ? (
                <div className="filters-empty">No categories</div>
              ) : (
                categoryOptions.map((option) => (
                  <label key={option.slug} className="filters-option" onClick={stopPropagation}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.has(option.slug)}
                      onChange={() => toggleSetValue(setSelectedCategories, option.slug)}
                      onClick={stopPropagation}
                    />
                    {option.name} <span className="filters-count">({option.count})</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("brand")}
            >
              <span className="filters-title">Brand</span>
              <span className={`filters-chevron ${expandedSections.brand ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.brand ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              {facetsLoading ? (
                <div className="filters-empty">Loading...</div>
              ) : sortedBrandCounts.length === 0 ? (
                <div className="filters-empty">No brands</div>
              ) : (
                <>
                  {topBrandCounts.map(([name, count]) => (
                    <label key={name} className="filters-option" onClick={stopPropagation}>
                      <input
                        type="checkbox"
                        checked={selectedBrands.has(name)}
                        onChange={() => toggleSetValue(setSelectedBrands, name)}
                        onClick={stopPropagation}
                      />
                      {name} <span className="filters-count">({count})</span>
                    </label>
                  ))}
                  {remainingBrandCount > 0 && (
                    <button
                      type="button"
                      className="filters-more"
                      onClick={() => setBrandModalOpen(true)}
                    >
                      + {remainingBrandCount} more
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("price")}
            >
              <span className="filters-title">Price</span>
              <span className={`filters-chevron ${expandedSections.price ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.price ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              <div className="filters-range">
                <span>
                  ₹{PRICE_MIN.toLocaleString()} — ₹{priceRangeMax.toLocaleString()}
                </span>
                <input
                  type="range"
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  value={priceRangeMax}
                  onChange={handlePriceChange}
                  onMouseUp={applyPriceFilter}
                  onTouchEnd={applyPriceFilter}
                />
              </div>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedPrices.has("under-1000")}
                  onChange={() => toggleSetValue(setSelectedPrices, "under-1000")}
                  onClick={stopPropagation}
                />
                Under ₹1,000
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedPrices.has("1000-3000")}
                  onChange={() => toggleSetValue(setSelectedPrices, "1000-3000")}
                  onClick={stopPropagation}
                />
                ₹1,000 – ₹3,000
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedPrices.has("3000-5000")}
                  onChange={() => toggleSetValue(setSelectedPrices, "3000-5000")}
                  onClick={stopPropagation}
                />
                ₹3,000 – ₹5,000
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedPrices.has("5000+")}
                  onChange={() => toggleSetValue(setSelectedPrices, "5000+")}
                  onClick={stopPropagation}
                />
                ₹5,000+
              </label>
            </div>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("ratings")}
            >
              <span className="filters-title">Customer Ratings</span>
              <span className={`filters-chevron ${expandedSections.ratings ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.ratings ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedRatings.has("4")}
                  onChange={() => toggleSetValue(setSelectedRatings, "4")}
                  onClick={stopPropagation}
                />
                4★ &amp; above
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedRatings.has("3")}
                  onChange={() => toggleSetValue(setSelectedRatings, "3")}
                  onClick={stopPropagation}
                />
                3★ &amp; above
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedRatings.has("2")}
                  onChange={() => toggleSetValue(setSelectedRatings, "2")}
                  onClick={stopPropagation}
                />
                2★ &amp; above
              </label>
            </div>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("availability")}
            >
              <span className="filters-title">Availability</span>
              <span className={`filters-chevron ${expandedSections.availability ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.availability ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={availability.inStock}
                  onChange={() =>
                    setAvailability((prev) => ({ ...prev, inStock: !prev.inStock }))
                  }
                  onClick={stopPropagation}
                />
                In Stock
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={availability.outOfStock}
                  onChange={() =>
                    setAvailability((prev) => ({ ...prev, outOfStock: !prev.outOfStock }))
                  }
                  onClick={stopPropagation}
                />
                Out of Stock
              </label>
            </div>
          </div>

          <div className="filters-section">
            <button
              type="button"
              className="filters-toggle"
              onClick={() => toggleSection("discount")}
            >
              <span className="filters-title">Discount</span>
              <span className={`filters-chevron ${expandedSections.discount ? "open" : ""}`} />
            </button>
            <div
              className={`filters-body ${expandedSections.discount ? "open" : "collapsed"}`}
              onClick={stopPropagation}
            >
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedDiscounts.has("10")}
                  onChange={() => toggleSetValue(setSelectedDiscounts, "10")}
                  onClick={stopPropagation}
                />
                10% and above
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedDiscounts.has("20")}
                  onChange={() => toggleSetValue(setSelectedDiscounts, "20")}
                  onClick={stopPropagation}
                />
                20% and above
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedDiscounts.has("30")}
                  onChange={() => toggleSetValue(setSelectedDiscounts, "30")}
                  onClick={stopPropagation}
                />
                30% and above
              </label>
              <label className="filters-option" onClick={stopPropagation}>
                <input
                  type="checkbox"
                  checked={selectedDiscounts.has("50")}
                  onChange={() => toggleSetValue(setSelectedDiscounts, "50")}
                  onClick={stopPropagation}
                />
                50% and above
              </label>
            </div>
          </div>

          <div className="filters-summary">
            <div className="filters-summary-title">Filters</div>
            <div className="filters-summary-list">
              <span>Category</span>
              <span>Brand</span>
              <span>Price</span>
              <span>Discount</span>
              <span>Ratings</span>
              <span>Availability</span>
            </div>
          </div>
        </aside>

        <section className="retailer-products-main">
          <div className="retailer-products-toolbar">
            <div className="toolbar-left">{pageInfo}</div>
            <div className="toolbar-right">
              <label htmlFor="sort" className="toolbar-label">
                Sort by:
              </label>
              <div className="toolbar-select-wrapper">
                <select
                  id="sort"
                  className="toolbar-select"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                >
                  <option value="recommended">Recommended</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="rating">Rating</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>
          </div>

          {error && <div className="retailer-products-error">{error}</div>}

          <div className={`retailer-products-grid ${loading ? "is-loading" : ""}`}>
            {sortedProducts.map((product) => {
                const stockValue = Number(product?.stock);
                const hasStockValue = Number.isFinite(stockValue) && stockValue >= 0;
                const stockTone = hasStockValue && stockValue > 10 ? "high" : "low";
                const stockLabel = hasStockValue
                  ? stockValue === 0
                    ? "Out of stock"
                    : stockValue > 10
                    ? `In stock: ${stockValue}`
                    : `Only ${stockValue} left`
                  : "";

                const priceValue = Number(product?.price);
                const mrpValue = Number(product?.mrp);
                const hasPrice = Number.isFinite(priceValue) && priceValue > 0;
                const hasMrp = Number.isFinite(mrpValue) && mrpValue > 0;
                const discountPercent = Number.isFinite(Number(product?.discountPercent))
                  ? Math.round(Number(product.discountPercent))
                  : hasPrice && hasMrp && mrpValue > priceValue
                  ? Math.round(((mrpValue - priceValue) / mrpValue) * 100)
                  : null;

                return (
                <div key={product.id} className="product-card">
                  <button
                    className={`product-wishlist ${wishlist.has(product.id) ? "active" : ""}`}
                    aria-label="Add to favorites"
                    onClick={() => toggleWishlist(product)}
                  >
                    {wishlist.has(product.id) ? "♥" : "♡"}
                  </button>
                  <a
                    className="product-card-link"
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
                        // Ignore storage errors
                      }
                    }}
                  >
                    <div className="product-card-image">
                      <div className="product-rating">
                        <span className="rating-value">
                          {Number.isFinite(Number(product?.rating))
                            ? Number(product.rating).toFixed(1)
                            : "0.0"}
                        </span>
                        <span className="rating-star">★</span>
                        <span className="rating-dot">|</span>
                        <span className="rating-count">
                          {Number.isFinite(Number(product?.reviewsCount))
                            ? Number(product.reviewsCount).toLocaleString()
                            : "0"}
                        </span>
                      </div>
                      {product.imageUrl ? (
                        <img
                          className="product-image"
                          src={product.imageUrl}
                          alt={product.name || "Product"}
                          loading="lazy"
                        />
                      ) : (
                        <div className="product-image-placeholder">
                          <span>{product.name?.charAt(0) || "P"}</span>
                        </div>
                      )}
                    </div>
                    <div className="product-card-body">
                      {product.brand && <div className="product-brand">{product.brand}</div>}
                      <div className="product-name">{product.name}</div>
                      <div className="product-desc">{product.description}</div>
                      <div className="product-price-row">
                        <span className="product-price">
                          Rs. {hasPrice ? priceValue.toLocaleString() : "0"}
                        </span>
                        {hasMrp && (
                          <span className="product-mrp">Rs. {mrpValue.toLocaleString()}</span>
                        )}
                        {Number.isFinite(discountPercent) && (
                          <span className="product-discount">({discountPercent}% OFF)</span>
                        )}
                      </div>
                      {Number.isFinite(stockValue) && (
                        <div className={`product-stock product-stock-${stockTone}`}>
                          {stockLabel}
                        </div>
                      )}
                    </div>
                  </a>
                </div>
                );
              })}
          </div>

          <div className="retailer-products-pagination">
            <button
              className="retailer-products-pageBtn"
              disabled={page === 0}
              onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            >
              Prev
            </button>
            <span className="retailer-products-pageInfo">
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="retailer-products-pageBtn"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
            >
              Next
            </button>
          </div>
        </section>
      </div>
    </div>
    {brandModalOpen && (
      <div
        className="brand-modal-overlay"
        onClick={() => {
          setBrandModalOpen(false);
          setBrandSearch("");
        }}
      >
        <div className="brand-modal" onClick={stopPropagation}>
          <div className="brand-modal-header">
            <span>Brand</span>
            <button
              type="button"
              className="brand-modal-close"
              onClick={() => {
                setBrandModalOpen(false);
                setBrandSearch("");
              }}
            >
              ×
            </button>
          </div>
          <div className="brand-modal-search">
            <input
              type="text"
              placeholder="Search Brand"
              value={brandSearch}
              onChange={(event) => setBrandSearch(event.target.value)}
            />
          </div>
          <div className="brand-modal-letters">
            {brandAlphabet.map((letter) => (
              <button
                key={letter}
                type="button"
                className="brand-letter"
                onClick={() => scrollToBrandGroup(letter)}
              >
                {letter}
              </button>
            ))}
          </div>
          <div className="brand-modal-body">
            {brandGroups.length === 0 ? (
              <div className="filters-empty">No brands</div>
            ) : (
              brandGroups.map((group) => (
                <div key={group.key} id={`brand-group-${group.key}`} className="brand-group">
                  <div className="brand-group-title">{group.key}</div>
                  <div className="brand-group-list">
                    {group.items.map(([name, count]) => (
                      <label key={name} className="filters-option" onClick={stopPropagation}>
                        <input
                          type="checkbox"
                          checked={selectedBrands.has(name)}
                          onChange={() => toggleSetValue(setSelectedBrands, name)}
                          onClick={stopPropagation}
                        />
                        {name} <span className="filters-count">({count})</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
