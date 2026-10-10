/* ===================================================================
   TravelGo - Main Shared JavaScript
   Handles common helpers, API config, auth state, and dynamic navbar
   =================================================================== */

const API_BASE_URL = "http://localhost:8085/api";

const DEFAULT_PACKAGE_ITINERARIES = {
  "goa beach escape": {
    places: "Baga Beach\nFort Aguada\nBasilica of Bom Jesus\nAnjuna Flea Market",
    placeImages: [
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Baga_Beach_25012016.jpg/960px-Baga_Beach_25012016.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/95/Fort_Aguada_Remote_view_25012016.jpg/960px-Fort_Aguada_Remote_view_25012016.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Side_Elevation_of_Basilica_of_Bom_Jesus.jpg/960px-Side_Elevation_of_Basilica_of_Bom_Jesus.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/Anjuna%2C_Goa%2C_India%2C_Anjuna_Flea_Market_2.jpg/960px-Anjuna%2C_Goa%2C_India%2C_Anjuna_Flea_Market_2.jpg"
    ].join("\n"),
    placeImageSources: [
      "https://commons.wikimedia.org/wiki/File:Baga_Beach_25012016.jpg",
      "https://commons.wikimedia.org/wiki/File:Fort_Aguada_Remote_view_25012016.jpg",
      "https://commons.wikimedia.org/wiki/File:Side_Elevation_of_Basilica_of_Bom_Jesus.jpg",
      "https://commons.wikimedia.org/wiki/File:Anjuna,_Goa,_India,_Anjuna_Flea_Market_2.jpg"
    ].join("\n")
  },
  "manali adventure": {
    places: "Hadimba Devi Temple\nSolang Valley\nAtal Tunnel\nOld Manali",
    placeImages: [
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/28/Hadimba_Devi_Temple_Manali.jpg/960px-Hadimba_Devi_Temple_Manali.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Solang_Valley%2C_Manali.jpg/960px-Solang_Valley%2C_Manali.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/PM_Narendra_Modi_stands_at_the_entrance_to_the_Atal_Tunnel_in_Rohtang.jpg/960px-PM_Narendra_Modi_stands_at_the_entrance_to_the_Atal_Tunnel_in_Rohtang.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Old_Manali%2C_Manali%2C_India_%28Unsplash_MSK-2kuYJDE%29.jpg/960px-Old_Manali%2C_Manali%2C_India_%28Unsplash_MSK-2kuYJDE%29.jpg"
    ].join("\n"),
    placeImageSources: [
      "https://commons.wikimedia.org/wiki/File:Hadimba_Devi_Temple_Manali.jpg",
      "https://commons.wikimedia.org/wiki/File:Solang_Valley,_Manali.jpg",
      "https://commons.wikimedia.org/wiki/File:PM_Narendra_Modi_stands_at_the_entrance_to_the_Atal_Tunnel_in_Rohtang.jpg",
      "https://commons.wikimedia.org/wiki/File:Old_Manali,_Manali,_India_(Unsplash_MSK-2kuYJDE).jpg"
    ].join("\n")
  },
  "kerala backwaters": {
    places: "Alleppey Backwaters\nMunnar Tea Gardens\nMattupetty Dam\nFort Kochi",
    placeImages: [
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d5/Alleppey_backwaters_view_%2C_Kerala_%2C_India_15.jpg/960px-Alleppey_backwaters_view_%2C_Kerala_%2C_India_15.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Munnar_tea_gardens.jpg/960px-Munnar_tea_gardens.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Mattupetty_Lake_View.jpg/960px-Mattupetty_Lake_View.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Chinese_Fishing_Nets_-_2.jpg/960px-Chinese_Fishing_Nets_-_2.jpg"
    ].join("\n"),
    placeImageSources: [
      "https://commons.wikimedia.org/wiki/File:Alleppey_backwaters_view_,_Kerala_,_India_15.jpg",
      "https://commons.wikimedia.org/wiki/File:Munnar_tea_gardens.jpg",
      "https://commons.wikimedia.org/wiki/File:Mattupetty_Lake_View.jpg",
      "https://commons.wikimedia.org/wiki/File:Chinese_Fishing_Nets_-_2.jpg"
    ].join("\n")
  },
  "hyderabad heritage tour": {
    places: "Charminar\nGolconda Fort\nSalar Jung Museum\nChowmahalla Palace",
    placeImages: [
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Charminar_Hyderabad_1.jpg/960px-Charminar_Hyderabad_1.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Golconda_Fort%2C_Hyderabad_%28Oct_2025%29_-_3.jpg/960px-Golconda_Fort%2C_Hyderabad_%28Oct_2025%29_-_3.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Salar_Jung_Museum%2C_the_building_and_complex_in_Hyderabad_21.jpg/960px-Salar_Jung_Museum%2C_the_building_and_complex_in_Hyderabad_21.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/78/Chowmahalla_Palace_gate_tower_01.jpg/960px-Chowmahalla_Palace_gate_tower_01.jpg"
    ].join("\n"),
    placeImageSources: [
      "https://commons.wikimedia.org/wiki/File:Charminar_Hyderabad_1.jpg",
      "https://commons.wikimedia.org/wiki/File:Golconda_Fort,_Hyderabad_(Oct_2025)_-_3.jpg",
      "https://commons.wikimedia.org/wiki/File:Salar_Jung_Museum,_the_building_and_complex_in_Hyderabad_21.jpg",
      "https://commons.wikimedia.org/wiki/File:Chowmahalla_Palace_gate_tower_01.jpg"
    ].join("\n")
  },
  "jaipur royal trip": {
    places: "Amber Fort\nHawa Mahal\nCity Palace\nJantar Mantar",
    placeImages: [
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f7/Jaipur_03-2016_02_Amber_Fort.jpg/960px-Jaipur_03-2016_02_Amber_Fort.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg/960px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%28July_2022%29_-_img_01.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Jaipur_03-2016_20_City_Palace_complex.jpg/960px-Jaipur_03-2016_20_City_Palace_complex.jpg",
      "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Doors_of_Jantar_Mantar.jpg/960px-Doors_of_Jantar_Mantar.jpg"
    ].join("\n"),
    placeImageSources: [
      "https://commons.wikimedia.org/wiki/File:Jaipur_03-2016_02_Amber_Fort.jpg",
      "https://commons.wikimedia.org/wiki/File:East_facade_Hawa_Mahal_Jaipur_from_ground_level_(July_2022)_-_img_01.jpg",
      "https://commons.wikimedia.org/wiki/File:Jaipur_03-2016_20_City_Palace_complex.jpg",
      "https://commons.wikimedia.org/wiki/File:Doors_of_Jantar_Mantar.jpg"
    ].join("\n")
  }
};

function getPackageItinerary(pkg) {
  const packageName = String(pkg.name || "").trim().toLowerCase();
  const defaults = DEFAULT_PACKAGE_ITINERARIES[packageName] || {};
  return {
    places: pkg.places || defaults.places || "",
    placeImages: pkg.placeImages || defaults.placeImages || "",
    placeImageSources: pkg.placeImageSources || defaults.placeImageSources || ""
  };
}

function getPackageEffectivePrice(pkg) {
  const price = Number(pkg.price) || 0;
  const discountPercent = Number(pkg.discountPercent) || 0;
  return price * (1 - discountPercent / 100);
}

function apiFetch(url, options = {}) {
  return fetch(url, { ...options, credentials: "include" });
}

// --- Authentication Session Storage Helpers ---
function getCurrentUser() {
  const userJson = localStorage.getItem("travelgo_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error("Error parsing user from localStorage", e);
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem("travelgo_user", JSON.stringify(user));
}

function removeCurrentUser() {
  localStorage.removeItem("travelgo_user");
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === "ADMIN";
}

async function logout() {
  try {
    const response = await apiFetch(`${API_BASE_URL}/users/logout`, { method: "POST" });
    if (!response.ok) {
      throw new Error("Could not end the server session.");
    }
  } catch (error) {
    console.error("Error ending the server session:", error);
  } finally {
    removeCurrentUser();
    window.location.href = "login.html";
  }
}

// --- Dynamic Navigation Bar ---
function updateNavbar() {
  const navAuth = document.getElementById("navAuth");
  if (!navAuth) return;

  const user = getCurrentUser();

  if (user) {
    let adminLink = "";
    if (user.role === "ADMIN") {
      adminLink = `<a href="/admin">Admin Panel</a>`;
    }
    const accountLink = user.role === "ADMIN"
      ? adminLink
      : user.role === "STAFF"
        ? '<a href="/staff">Assigned Trips</a>'
        : '<a href="my-bookings.html">My Bookings</a>';

    navAuth.innerHTML = `
      ${accountLink}
      <span class="user-badge">👤 ${escapeHtml(user.name)}</span>
      <button class="btn btn-outline btn-sm" onclick="logout()">Logout</button>
    `;
  } else {
    navAuth.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Customer Login</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }

  // Highlight active link based on current page
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".nav-links a");
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    if (href === currentPath) {
      link.classList.add("active");
    }
  });
}

// --- UI Notification Helper ---
function showAlert(containerId, message, type = "success") {
  const container = document.getElementById(containerId);
  if (!container) return;

  const alertClass = type === "error" ? "alert-error" : "alert-success";
  container.innerHTML = `
    <div class="alert ${alertClass}">
      <span>${escapeHtml(message)}</span>
      <button style="background:none;border:none;cursor:pointer;font-size:1.1rem;color:inherit;" onclick="this.parentElement.remove()">✕</button>
    </div>
  `;
}

// --- Format Currency (INR) ---
function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

// --- Escape HTML to prevent XSS ---
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.innerText = text;
  return div.innerHTML;
}

// Run on page load
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();
});
