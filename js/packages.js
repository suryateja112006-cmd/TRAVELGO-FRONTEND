/* ===================================================================
   TravelGo - Packages JavaScript (packages.js)
   Fetches, renders, searches, and displays package details
   =================================================================== */

let allPackages = [];

// Accent styling array for card headers
const accents = ["accent-1", "accent-2", "accent-3", "accent-4", "accent-5"];

function getPackagePlaces(pkg) {
  return String(getPackageItinerary(pkg).places)
    .split(/\r?\n/)
    .map((place) => place.trim())
    .filter(Boolean);
}

function getPackageLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim());
}

function getSafePhotoUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function getPackagePlacePhotos(pkg, placeCount) {
  const itinerary = getPackageItinerary(pkg);
  const images = getPackageLines(itinerary.placeImages);
  const sources = getPackageLines(itinerary.placeImageSources);
  return Array.from({ length: placeCount }, (_, index) => ({
    image: getSafePhotoUrl(images[index] || ""),
    source: getSafePhotoUrl(sources[index] || "")
  }));
}

// --- Fetch all packages from REST API ---
async function fetchPackages() {
  try {
    const response = await apiFetch(`${API_BASE_URL}/packages`);
    if (!response.ok) {
      throw new Error(`Failed to load packages (Status: ${response.status})`);
    }
    const data = await response.json();
    allPackages = data;
    return data;
  } catch (err) {
    console.error("Error fetching packages:", err);
    return [];
  }
}

// --- Render Package Cards ---
function renderPackageCards(packages, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!packages || packages.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <h3>No Packages Found</h3>
        <p>There are currently no travel packages matching your search.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = packages
    .map((pkg, index) => {
      const accent = accents[index % accents.length];
      const places = getPackagePlaces(pkg);
      const effectivePrice = getPackageEffectivePrice(pkg);
      const discountPercent = Number(pkg.discountPercent) || 0;
      const packageBadges = [
        discountPercent > 0 ? `${discountPercent}% offer` : "",
        pkg.familyFriendly ? "Family-friendly" : "",
        pkg.groupTrip ? "Group trip" : ""
      ].filter(Boolean);
      return `
        <div class="package-card">
          <div class="package-card-header ${accent}">
            <h3>${escapeHtml(pkg.name)}</h3>
            <div class="package-destination">
              <span>📍</span> ${escapeHtml(pkg.destination)}
            </div>
          </div>
          <div class="package-card-body">
            <div class="package-meta">
              <div class="meta-item">
                <span class="meta-label">Duration</span>
                <span class="meta-value">⏱ ${escapeHtml(pkg.duration)}</span>
              </div>
              <div class="meta-item" style="text-align: right;">
                <span class="meta-label">Price</span>
                <span class="meta-price">${formatCurrency(effectivePrice)}</span>
                ${discountPercent > 0 ? `<span class="meta-price-original">${formatCurrency(pkg.price)}</span>` : ""}
              </div>
            </div>
            ${packageBadges.length ? `<div class="package-badges">${packageBadges.map((badge) => `<span class="package-badge">${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
            <p class="package-desc">${escapeHtml(pkg.description || "Experience the ultimate holiday with TravelGo's all-inclusive package.")}</p>
            ${places.length ? `
              <div class="package-places-preview">
                <span class="places-preview-label">PLACES YOU'LL VISIT</span>
                <span>${places.slice(0, 3).map(escapeHtml).join(" · ")}${places.length > 3 ? ` <span class="places-more">+${places.length - 3} more</span>` : ""}</span>
              </div>
            ` : ""}
            <div class="package-actions">
              <a href="package-details.html?id=${encodeURIComponent(pkg.id)}" class="btn btn-outline btn-sm">View itinerary</a>
              <a href="booking.html?packageId=${pkg.id}" class="btn btn-secondary btn-sm">Book Now</a>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

// --- Package Details Page Loader ---
async function loadPackageDetails() {
  const container = document.getElementById("packageDetailsContainer");
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const packageId = urlParams.get("id");

  if (!packageId) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Invalid Package</h3>
        <p>No package ID was provided in the URL.</p>
        <a href="packages.html" class="btn btn-primary">Browse Packages</a>
      </div>
    `;
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/packages/${packageId}`);
    if (!response.ok) {
      throw new Error("Travel package not found");
    }

    const pkg = await response.json();
    if (pkg.active === false) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>Package no longer available</h3>
          <p>${escapeHtml(pkg.name)} has been deleted. Existing bookings are still available in your booking history.</p>
          <a href="packages.html" class="btn btn-primary">Browse available packages</a>
        </div>
      `;
      return;
    }
    const places = getPackagePlaces(pkg);
    const placePhotos = getPackagePlacePhotos(pkg, places.length);
    const effectivePrice = getPackageEffectivePrice(pkg);
    const discountPercent = Number(pkg.discountPercent) || 0;
    const packageBadges = [
      discountPercent > 0 ? `${discountPercent}% offer` : "",
      pkg.familyFriendly ? "Family-friendly" : "",
      pkg.groupTrip ? "Group trip" : ""
    ].filter(Boolean);

    container.innerHTML = `
      <div class="package-detail-page">
        <a href="packages.html" class="package-back-link">← All packages</a>
        <section class="package-detail-hero">
          <div class="package-hero-content">
            <span class="package-hero-kicker">YOUR NEXT ADVENTURE</span>
            <h1>${escapeHtml(pkg.name)}</h1>
            <p class="package-hero-destination">📍 ${escapeHtml(pkg.destination)}</p>
            <div class="package-hero-meta">
              <span>◷ ${escapeHtml(pkg.duration)}</span>
              <span>⌖ ${places.length} places to explore</span>
            </div>
          </div>
          <div class="package-hero-art" aria-hidden="true">
            <span class="hero-art-sun"></span>
            <span class="hero-art-mountain mountain-back"></span>
            <span class="hero-art-mountain mountain-front"></span>
            <span class="hero-art-pin">⌖</span>
          </div>
        </section>

        <div class="package-detail-layout">
          <div class="package-detail-main">
            <section class="package-detail-card">
              <div class="package-section-kicker">THE EXPERIENCE</div>
              <h2>About this trip</h2>
              <p class="package-overview-copy">
                ${escapeHtml(pkg.description || `Discover ${pkg.destination} with a thoughtfully planned trip filled with local highlights and memorable experiences.`)}
              </p>
            </section>

            <section class="package-detail-card itinerary-card">
              <div class="itinerary-heading">
                <div>
                  <div class="package-section-kicker">YOUR ROUTE</div>
                  <h2>Places you'll visit</h2>
                  <p>Your trip highlights, in order</p>
                </div>
                <span class="itinerary-count">${places.length} STOPS</span>
              </div>
              ${places.length ? `
                <ol class="destination-itinerary">
                  ${places.map((place, index) => {
                    const photo = placePhotos[index];
                    return `
                    <li class="itinerary-stop">
                      <div class="itinerary-photo-frame ${photo.image ? "" : "photo-unavailable"}">
                        ${photo.image
                          ? `<img class="itinerary-photo" src="${escapeHtml(photo.image)}" alt="${escapeHtml(place)} in ${escapeHtml(pkg.destination)}" loading="lazy">`
                          : ""}
                        <div class="itinerary-photo-placeholder">Photo coming soon</div>
                      </div>
                      <div class="itinerary-stop-info">
                        <span class="itinerary-stop-number">STOP ${String(index + 1).padStart(2, "0")}</span>
                        <h3>${escapeHtml(place)}</h3>
                        ${photo.source ? `<a class="photo-credit" href="${escapeHtml(photo.source)}" target="_blank" rel="noopener noreferrer">Photo source ↗</a>` : ""}
                      </div>
                    </li>
                  `;
                  }).join("")}
                </ol>
              ` : `
                <div class="itinerary-empty">
                  <span aria-hidden="true">⌖</span>
                  <p>The places for this trip are being planned. Please contact us for the latest itinerary.</p>
                </div>
              `}
            </section>

            <section class="package-detail-card">
              <div class="package-section-kicker">TRAVEL WITH EASE</div>
              <h2>Included with your trip</h2>
              <ul class="package-inclusions">
                <li><span>✓</span> Comfortable accommodation</li>
                <li><span>✓</span> Guided sightseeing at the listed places</li>
                <li><span>✓</span> Local trip coordination and support</li>
                <li><span>✓</span> A dedicated travel staff in-charge</li>
              </ul>
            </section>
          </div>

          <aside class="package-booking-card">
            <span class="booking-card-label">TRIP PRICE</span>
            <div class="package-detail-price">${formatCurrency(effectivePrice)}</div>
            ${discountPercent > 0 ? `<span class="meta-price-original">${formatCurrency(pkg.price)} before offer</span>` : ""}
            <span class="booking-card-subtitle">per person</span>
            ${packageBadges.length ? `<div class="package-badges">${packageBadges.map((badge) => `<span class="package-badge">${escapeHtml(badge)}</span>`).join("")}</div>` : ""}
            <div class="booking-card-divider"></div>
            <div class="booking-card-fact"><span>Trip length</span><strong>${escapeHtml(pkg.duration)}</strong></div>
            <div class="booking-card-fact"><span>Destination</span><strong>${escapeHtml(pkg.destination)}</strong></div>
            <div class="booking-card-fact"><span>Places to visit</span><strong>${places.length} stops</strong></div>

            <a href="booking.html?packageId=${encodeURIComponent(pkg.id)}" class="btn btn-secondary btn-block package-book-now">
              Book this trip
            </a>
            <p class="booking-card-footnote">Secure your place and get ready to explore.</p>
          </aside>
        </div>
      </div>
    `;
    container.querySelectorAll(".itinerary-photo").forEach((image) => {
      image.addEventListener("error", () => {
        const frame = image.closest(".itinerary-photo-frame");
        if (frame) frame.classList.add("photo-unavailable");
        image.remove();
      }, { once: true });
    });
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Package Not Found</h3>
        <p>${escapeHtml(err.message)}</p>
        <a href="packages.html" class="btn btn-primary">Browse Packages</a>
      </div>
    `;
  }
}

// --- Package Search / Filter Setup ---
function applyPackageFilters() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  const term = searchInput.value.toLowerCase().trim();
  const budgetOnly = document.getElementById("budgetFriendlyFilter").checked;
  const offersOnly = document.getElementById("offersFilter").checked;
  const familyOnly = document.getElementById("familyFriendlyFilter").checked;
  const groupsOnly = document.getElementById("groupTripsFilter").checked;
  const filtered = allPackages.filter((pkg) => {
    const nameMatch = pkg.name && pkg.name.toLowerCase().includes(term);
    const destMatch = pkg.destination && pkg.destination.toLowerCase().includes(term);
    return (nameMatch || destMatch)
      && (!budgetOnly || getPackageEffectivePrice(pkg) < 10000)
      && (!offersOnly || Number(pkg.discountPercent) > 0)
      && (!familyOnly || pkg.familyFriendly)
      && (!groupsOnly || pkg.groupTrip);
  });
  renderPackageCards(filtered, "packagesContainer");
  const resultCount = document.getElementById("packageResultCount");
  if (resultCount) {
    resultCount.textContent = `Showing ${filtered.length} of ${allPackages.length} packages`;
  }
}

function setupSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", applyPackageFilters);
  ["budgetFriendlyFilter", "offersFilter", "familyFriendlyFilter", "groupTripsFilter"]
    .forEach((id) => document.getElementById(id).addEventListener("change", applyPackageFilters));
  document.getElementById("clearPackageFilters").addEventListener("click", () => {
    searchInput.value = "";
    ["budgetFriendlyFilter", "offersFilter", "familyFriendlyFilter", "groupTripsFilter"]
      .forEach((id) => { document.getElementById(id).checked = false; });
    applyPackageFilters();
  });
}

async function refreshPackageSurface() {
  const packageContainer = document.getElementById("packagesContainer");
  const featuredContainer = document.getElementById("featuredPackagesContainer");
  if (packageContainer || featuredContainer) {
    const packages = await fetchPackages();
    if (packageContainer) {
      if (document.getElementById("searchInput")) applyPackageFilters();
      else renderPackageCards(packages, "packagesContainer");
    }
    if (featuredContainer) renderPackageCards(packages.slice(0, 3), "featuredPackagesContainer");
  }
  if (document.getElementById("packageDetailsContainer")) await loadPackageDetails();
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", async () => {
  setupSearchFilter();
  await refreshPackageSurface();
});

window.addEventListener("focus", () => {
  if (document.visibilityState === "visible") refreshPackageSurface();
});
