document.addEventListener("DOMContentLoaded", () => {
  let allProducts = [];
  /** Upper bound for price slider / max input; set from catalog after load */
  let priceFilterMax = 10000;
  const productGrid = document.getElementById("productGrid");
  const mobileFilterBtn = document.getElementById("mobileFilterBtn");
  const mobileFilterPanel = document.getElementById("mobileFilterPanel");
  const closeMobileFilter = document.getElementById("closeMobileFilter");
  const applyMobileFilters = document.getElementById("applyMobileFilters");

  if (!productGrid) return;

  const numericPrice = (product) => Number(product.price) || 0;

  const getAllPriceInputs = () => ({
    desktop: {
      minPrice: document.getElementById("minPrice"),
      maxPrice: document.getElementById("maxPrice"),
      priceRange: document.getElementById("priceRange"),
    },
    mobile: {
      minPrice: document.getElementById("minPriceMobile"),
      maxPrice: document.getElementById("maxPriceMobile"),
      priceRange: document.getElementById("priceRangeMobile"),
    },
  });

  const syncPriceFilterRange = (maxVal) => {
    priceFilterMax = maxVal;
    const inputs = getAllPriceInputs();
    ["desktop", "mobile"].forEach((k) => {
      const set = inputs[k];
      if (set.priceRange) {
        set.priceRange.max = String(maxVal);
        set.priceRange.value = String(maxVal);
      }
      if (set.maxPrice) {
        set.maxPrice.max = String(maxVal);
        set.maxPrice.value = String(maxVal);
      }
    });
  };

  // Fetch Products
  fetch("products.json")
    .then((response) => response.json())
    .then((data) => {
      allProducts = data;
      const prices = data.map((p) => numericPrice(p)).filter((n) => n > 0);
      const catalogMax = prices.length ? Math.max(...prices) : 1000;
      syncPriceFilterRange(Math.max(1000, catalogMax));
      renderProducts(allProducts);
      setupEventListeners();
    })
    .catch((error) => console.error("Error loading products:", error));

  // Render Product Cards (Updated UI)
  function renderProducts(products) {
    productGrid.innerHTML = "";

    if (products.length === 0) {
      productGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-xl text-gray-500 font-serif">No products found matching your criteria.</p>
                </div>`;
      return;
    }
    // updated ui
    products.forEach((product) => {
      const card = document.createElement("div");
      // UPDATED UI: Added border, shadow hover effects, padding, and rounding
      card.className =
        "flex flex-col items-center text-center group bg-white border border-transparent hover:border-brand-gold hover:shadow-2xl transition-all duration-300 rounded-3xl p-4";

      // Availability Badge
      const availabilityBadge =
        product.availability === "out_of_stock"
          ? '<span class="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 uppercase tracking-wider font-bold z-10 rounded">Sold Out</span>'
          : "";

      card.innerHTML = `
                <div class="w-full aspect-square overflow-hidden mb-6 relative rounded-2xl">
                    ${availabilityBadge}
                    <img src="${product.image}" alt="${
                      product.name
                    }" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-2xl">
                </div>
                <h3 class="font-serif text-3xl text-gray-900 mb-1">${
                  product.name
                }</h3>
                <p class="text-brand-brown text-sm font-semibold mb-2">LKR ${
                  product.price
                } /sqft</p>
                <p class="text-gray-500 text-xs mb-4 uppercase tracking-wide">${
                  product.material
                } • ${product.finish}</p>
                <div class="text-xs text-gray-400 mb-6 space-y-1">
                     <p>Size: ${product.size}</p>
                     <p>Thickness: ${
                       Array.isArray(product.thickness)
                         ? product.thickness.join(" | ")
                         : product.thickness
                     }</p>
                </div>
                <a href="${
                  product.target || "#"
                }" class="bg-brand-gold text-brand-dark font-semibold py-3 px-10 hover:bg-brand-dark hover:text-brand-gold transition-colors duration-300 inline-block rounded">
                    View Details
                </a>
            `;
      productGrid.appendChild(card);
    });
  }

  // Filter Logic
  function applyFilters() {
    // 1. Collect Checkbox Values
    const getCheckedValues = (name) => {
      return Array.from(
        document.querySelectorAll(`input[name="${name}"]:checked`),
      ).map((cb) => cb.value);
    };

    // New Category Filter
    const selectedCategories = getCheckedValues("category");

    // Existing Filters
    const selectedColors = getCheckedValues("color");
    const selectedMaterials = getCheckedValues("material"); // Stone Type
    const selectedFinishes = getCheckedValues("finish");
    const selectedThicknesses = getCheckedValues("thickness");
    const selectedSizes = getCheckedValues("size");

    // Price - use desktop inputs if available, otherwise mobile
    const inputs = getAllPriceInputs();
    const activeRange = inputs.desktop.priceRange || inputs.mobile.priceRange;
    const activeMin = inputs.desktop.minPrice || inputs.mobile.minPrice;
    const activeMax = inputs.desktop.maxPrice || inputs.mobile.maxPrice;

    const maxPrice = parseInt(activeRange?.value ?? String(priceFilterMax), 10);
    const minInputVal = parseInt(activeMin?.value || "0", 10) || 0;
    const maxPriceClamped =
      Number.isFinite(maxPrice) && maxPrice >= 0
        ? Math.min(maxPrice, priceFilterMax)
        : priceFilterMax;

    const filtered = allProducts.filter((product) => {
      // Category Check (New)
      if (
        selectedCategories.length > 0 &&
        !selectedCategories.includes(product.category)
      )
        return false;

      // Price Check (JSON stores price as string; compare as number)
      const pPrice = numericPrice(product);
      if (pPrice < minInputVal || pPrice > maxPriceClamped) return false;

      // Multi-select Checks (OR logic within category)
      if (selectedColors.length > 0 && !selectedColors.includes(product.color))
        return false;
      if (
        selectedMaterials.length > 0 &&
        !selectedMaterials.includes(product.material)
      )
        return false;
      if (
        selectedFinishes.length > 0 &&
        !selectedFinishes.includes(product.finish)
      )
        return false;
      if (selectedThicknesses.length > 0) {
        // Handle both array and string thickness for backward compatibility
        const productThicknesses = Array.isArray(product.thickness)
          ? product.thickness
          : [product.thickness];
        // Check if any selected thickness matches any product thickness
        const hasMatchingThickness = selectedThicknesses.some((selected) =>
          productThicknesses.includes(selected),
        );
        if (!hasMatchingThickness) return false;
      }
      if (selectedSizes.length > 0 && !selectedSizes.includes(product.size))
        return false;

      return true;
    });

    renderProducts(filtered);
  }

  // Setup Listeners
  function setupEventListeners() {
    // Checkboxes - attach listeners to all filter inputs
    const allFilterInputs = document.querySelectorAll('input[type="checkbox"]');
    allFilterInputs.forEach((input) => {
      input.addEventListener("change", () => {
        applyFilters();
      });
    });

    const inputs = getAllPriceInputs();

    // Desktop Price Range Slider
    if (inputs.desktop.priceRange) {
      inputs.desktop.priceRange.addEventListener("input", (e) => {
        const value = e.target.value;
        if (inputs.desktop.maxPrice) inputs.desktop.maxPrice.value = value;
        if (inputs.mobile.maxPrice) inputs.mobile.maxPrice.value = value;
        if (inputs.mobile.priceRange) inputs.mobile.priceRange.value = value;
        applyFilters();
      });
    }

    // Mobile Price Range Slider
    if (inputs.mobile.priceRange) {
      inputs.mobile.priceRange.addEventListener("input", (e) => {
        const value = e.target.value;
        if (inputs.mobile.maxPrice) inputs.mobile.maxPrice.value = value;
        if (inputs.desktop.maxPrice) inputs.desktop.maxPrice.value = value;
        if (inputs.desktop.priceRange) inputs.desktop.priceRange.value = value;
        applyFilters();
      });
    }

    // Desktop Max Price Input
    if (inputs.desktop.maxPrice) {
      inputs.desktop.maxPrice.addEventListener("change", (e) => {
        let val = parseInt(e.target.value, 10);
        if (!Number.isFinite(val)) val = priceFilterMax;
        if (val < 0) val = 0;
        if (val > priceFilterMax) val = priceFilterMax;
        if (inputs.desktop.priceRange) inputs.desktop.priceRange.value = val;
        if (inputs.mobile.priceRange) inputs.mobile.priceRange.value = val;
        if (inputs.mobile.maxPrice) inputs.mobile.maxPrice.value = val;
        applyFilters();
      });
    }

    // Mobile Max Price Input
    if (inputs.mobile.maxPrice) {
      inputs.mobile.maxPrice.addEventListener("change", (e) => {
        let val = parseInt(e.target.value, 10);
        if (!Number.isFinite(val)) val = priceFilterMax;
        if (val < 0) val = 0;
        if (val > priceFilterMax) val = priceFilterMax;
        if (inputs.mobile.priceRange) inputs.mobile.priceRange.value = val;
        if (inputs.desktop.priceRange) inputs.desktop.priceRange.value = val;
        if (inputs.desktop.maxPrice) inputs.desktop.maxPrice.value = val;
        applyFilters();
      });
    }

    // Desktop Min Price Input
    if (inputs.desktop.minPrice) {
      inputs.desktop.minPrice.addEventListener("change", (e) => {
        const value = e.target.value;
        if (inputs.mobile.minPrice) inputs.mobile.minPrice.value = value;
        applyFilters();
      });
    }

    // Mobile Min Price Input
    if (inputs.mobile.minPrice) {
      inputs.mobile.minPrice.addEventListener("change", (e) => {
        const value = e.target.value;
        if (inputs.desktop.minPrice) inputs.desktop.minPrice.value = value;
        applyFilters();
      });
    }
  }

  // Mobile Menu Logic (Fixed)
  function toggleMobileMenu() {
    if (mobileFilterPanel) {
      mobileFilterPanel.classList.toggle("translate-x-full");
      document.body.classList.toggle("overflow-hidden"); // Prevent scrolling when open
    }
  }

  if (mobileFilterBtn) {
    mobileFilterBtn.addEventListener("click", toggleMobileMenu);
  }

  if (closeMobileFilter) {
    closeMobileFilter.addEventListener("click", toggleMobileMenu);
  }

  if (applyMobileFilters) {
    applyMobileFilters.addEventListener("click", toggleMobileMenu);
  }
});
