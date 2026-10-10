/* ===================================================================
   TravelGo - Bookings & Admin JavaScript (booking.js)
   Handles booking flow, price calculation, my bookings, and admin operations
   =================================================================== */

let selectedPackagePrice = 0;
let adminStaff = [];
let adminBookings = [];
let adminPackageRecords = [];
let editingPackageId = null;

function getTravelerDetails() {
  return [...document.querySelectorAll(".traveler-card")].map((card) => ({
    name: card.querySelector(".traveler-name").value.trim(),
    email: card.querySelector(".traveler-email").value.trim(),
    phone: card.querySelector(".traveler-phone").value.trim()
  }));
}

function renderTravelerFields() {
  const container = document.getElementById("travelerFieldsContainer");
  const personsInput = document.getElementById("numberOfPersons");
  if (!container || !personsInput) return;

  const requestedCount = Number.parseInt(personsInput.value, 10);
  const count = Number.isInteger(requestedCount) && requestedCount > 0
    ? Math.min(requestedCount, Number(personsInput.max))
    : 1;
  const existingTravelers = getTravelerDetails();
  const user = getCurrentUser();

  container.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const traveler = existingTravelers[index] || (index === 0 ? {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || ""
    } : { name: "", email: "", phone: "" });
    const card = document.createElement("fieldset");
    card.className = "traveler-card";
    card.style.cssText = "border:1px solid var(--border-color);border-radius:8px;padding:16px;margin:0 0 16px;";

    const legend = document.createElement("legend");
    legend.textContent = `Traveler ${index + 1}${index === 0 ? " (Lead traveler)" : ""}`;
    legend.style.cssText = "font-weight:600;padding:0 6px;";
    card.append(legend);

    const fields = [
      { label: "Full Name *", type: "text", className: "traveler-name", value: traveler.name, autocomplete: "name" },
      { label: "Email Address *", type: "email", className: "traveler-email", value: traveler.email, autocomplete: "email" },
      { label: "Phone Number *", type: "tel", className: "traveler-phone", value: traveler.phone, autocomplete: "tel" }
    ];

    for (const field of fields) {
      const group = document.createElement("div");
      group.className = "form-group";
      const label = document.createElement("label");
      label.textContent = field.label;
      const input = document.createElement("input");
      input.type = field.type;
      input.className = field.className;
      input.value = field.value;
      input.autocomplete = field.autocomplete;
      input.required = true;
      label.htmlFor = `traveler-${index}-${field.className}`;
      input.id = label.htmlFor;
      group.append(label, input);
      card.append(group);
    }

    container.append(card);
  }
}

// --- Initialize Booking Page ---
async function initBookingPage() {
  const bookingForm = document.getElementById("bookingForm");
  const packageSelect = document.getElementById("packageSelect");
  if (!bookingForm || !packageSelect) return;

  renderTravelerFields();
  await loadBookingPackageOptions(packageSelect);

  // Event listeners for recalculating total
  packageSelect.addEventListener("change", calculateTotal);
  const personsInput = document.getElementById("numberOfPersons");
  personsInput.addEventListener("input", calculateTotal);
  personsInput.addEventListener("change", () => {
    renderTravelerFields();
    calculateTotal();
  });

  // Booking submit handler
  bookingForm.addEventListener("submit", handleBookingSubmit);
}

async function loadBookingPackageOptions(packageSelect) {
  const previouslySelectedId = packageSelect.value
    || new URLSearchParams(window.location.search).get("packageId")
    || "";
  try {
    const response = await apiFetch(`${API_BASE_URL}/packages`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not load travel packages.");
    }
    const packages = await response.json();
    packageSelect.innerHTML = `<option value="">-- Choose a Travel Package --</option>`;
    packages.forEach((pkg) => {
      const effectivePrice = getPackageEffectivePrice(pkg);
      const discountPercent = Number(pkg.discountPercent) || 0;
      packageSelect.innerHTML += `
        <option value="${pkg.id}" data-price="${effectivePrice}">
          ${escapeHtml(pkg.name)} (${escapeHtml(pkg.destination)}) - ${formatCurrency(effectivePrice)}${discountPercent > 0 ? ` (${discountPercent}% off)` : ""}
        </option>
      `;
    });

    packageSelect.value = previouslySelectedId;
    if (previouslySelectedId && !packageSelect.value) {
      showAlert("alertContainer", "The selected package is no longer available. Choose another package to continue.", "error");
    }

    calculateTotal();
  } catch (err) {
    console.error("Error loading packages for booking:", err);
    showAlert("alertContainer", err.message || "Could not load packages from backend.", "error");
  }
}

// --- Dynamic Price Calculation ---
// Total Amount = Package Price × Number of Persons
function calculateTotal() {
  const packageSelect = document.getElementById("packageSelect");
  const personsInput = document.getElementById("numberOfPersons");
  if (!packageSelect || !personsInput) return;

  const selectedOption = packageSelect.options[packageSelect.selectedIndex];
  selectedPackagePrice = selectedOption && selectedOption.dataset.price ? Number(selectedOption.dataset.price) : 0;
  const persons = parseInt(personsInput.value, 10) || 1;

  const total = selectedPackagePrice * persons;

  document.getElementById("summaryPackagePrice").textContent = formatCurrency(selectedPackagePrice);
  document.getElementById("summaryPersons").textContent = persons;
  document.getElementById("summaryTotal").textContent = formatCurrency(total);
}

// --- Submit Booking ---
async function handleBookingSubmit(e) {
  e.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    alert("Please log in to complete your booking.");
    window.location.href = "login.html";
    return;
  }

  const packageId = document.getElementById("packageSelect").value;
  const travelDate = document.getElementById("travelDate").value;
  const numberOfPersons = parseInt(document.getElementById("numberOfPersons").value, 10);
  const travelers = getTravelerDetails();

  if (!packageId) {
    showAlert("alertContainer", "Please select a travel package.", "error");
    return;
  }

  if (!travelDate) {
    showAlert("alertContainer", "Please select your travel date.", "error");
    return;
  }

  if (!numberOfPersons || numberOfPersons < 1) {
    showAlert("alertContainer", "Please enter at least 1 person.", "error");
    return;
  }

  if (numberOfPersons > 50) {
    showAlert("alertContainer", "A booking can include at most 50 travelers.", "error");
    return;
  }

  if (travelers.length !== numberOfPersons) {
    renderTravelerFields();
    showAlert("alertContainer", "Traveler details must be provided for every person.", "error");
    return;
  }

  if (travelers.some((traveler) => !traveler.name || !traveler.email || !traveler.phone)) {
    showAlert("alertContainer", "Please complete the name, email, and phone number for every traveler.", "error");
    return;
  }

  const totalAmount = selectedPackagePrice * numberOfPersons;

  const bookingPayload = {
    user: { id: user.id },
    travelPackage: { id: parseInt(packageId, 10) },
    travelDate: travelDate,
    numberOfPersons: numberOfPersons,
    totalAmount: totalAmount,
    status: "CONFIRMED",
    travelers
  };

  const submitBtn = document.getElementById("confirmBookingBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing Booking...";

  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || "Failed to confirm booking.");
    }

    const createdBooking = await response.json();
    const getDeliveryMessage = (status) => ({
      sent: "sent",
      failed: "could not be sent",
      no_recipient: "no recipient address available",
      not_configured: "not configured",
      undefined: "status unavailable"
    }[status] || "status unavailable");
    const emailStatus = getDeliveryMessage(createdBooking.notificationEmailStatus);
    const smsStatus = getDeliveryMessage(createdBooking.notificationSmsStatus);
    showAlert("alertContainer",
      `You booked ${createdBooking.travelPackage?.name || "this package"} (booking #${createdBooking.id}). Email: ${emailStatus}. SMS: ${smsStatus}. Redirecting to My Bookings...`,
      "success");

    setTimeout(() => {
      window.location.href = "my-bookings.html";
    }, 1500);
  } catch (err) {
    showAlert("alertContainer", err.message, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirm Booking";
  }
}

// --- Load My Bookings Page ---
async function loadMyBookings() {
  const container = document.getElementById("myBookingsContainer");
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Login Required</h3>
        <p>Please log in to view and manage your travel bookings.</p>
        <a href="login.html" class="btn btn-primary">Login Now</a>
      </div>
    `;
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings/user/${user.id}`);
    if (!response.ok) throw new Error("Could not fetch your bookings.");

    const bookings = await response.json();

    if (!bookings || bookings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No Bookings Yet</h3>
          <p>You haven't booked any travel packages yet. Explore our packages and start your journey!</p>
          <a href="packages.html" class="btn btn-primary">Explore Packages</a>
        </div>
      `;
      return;
    }

    let rowsHtml = bookings
      .map((b) => {
        const pkgName = b.travelPackage
          ? `${b.travelPackage.name}${b.travelPackage.active === false ? " (deleted)" : ""}`
          : "N/A";
        const pkgDest = b.travelPackage ? b.travelPackage.destination : "N/A";
        const isCancelled = b.status === "CANCELLED";
        const badgeClass = isCancelled ? "badge-cancelled" : "badge-confirmed";

        const actionBtn = isCancelled
          ? `<span style="color:var(--text-muted); font-size:0.85rem;">Cancelled</span>`
          : `<button class="btn btn-danger btn-sm" onclick="cancelBooking(${b.id})">Cancel</button>`;

        return `
          <tr>
            <td><strong>#${b.id}</strong></td>
            <td><strong>${escapeHtml(pkgName)}</strong></td>
            <td>📍 ${escapeHtml(pkgDest)}</td>
            <td>📅 ${escapeHtml(b.travelDate)}</td>
            <td>
              <details>
                <summary>👥 ${b.numberOfPersons} traveler${b.numberOfPersons === 1 ? "" : "s"}</summary>
                <ul style="padding-left:20px;">
                  ${(b.travelers || []).map((traveler) => `<li>${escapeHtml(traveler.name)} — ${escapeHtml(traveler.email)} — ${escapeHtml(traveler.phone)}</li>`).join("")}
                </ul>
              </details>
            </td>
            <td><strong style="color:var(--secondary-color);">${formatCurrency(b.totalAmount)}</strong></td>
            <td><span class="badge ${badgeClass}">${escapeHtml(b.status)}</span></td>
            <td><span class="badge ${b.paymentStatus === "PAID" ? "badge-confirmed" : "badge-cancelled"}">${escapeHtml(b.paymentStatus || "UNPAID")}</span></td>
            <td>${actionBtn}</td>
          </tr>
        `;
      })
      .join("");

    container.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Package</th>
              <th>Destination</th>
              <th>Travel Date</th>
              <th>Persons</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Error</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

// --- Cancel Booking ---
async function cancelBooking(bookingId) {
  if (!confirm(`Are you sure you want to cancel booking #${bookingId}?`)) {
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings/${bookingId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      throw new Error("Failed to cancel booking.");
    }

    showAlert("alertContainer", `Booking #${bookingId} has been cancelled successfully.`, "success");
    loadMyBookings();
  } catch (err) {
    showAlert("alertContainer", err.message, "error");
  }
}

// ===================================================================
// ADMIN DASHBOARD FUNCTIONS
// ===================================================================

async function initAdminDashboard() {
  const adminSection = document.getElementById("adminSection");
  if (!adminSection) return;

  const user = getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    window.location.replace("admin-login.html");
    return;
  }

  const greeting = document.getElementById("adminGreeting");
  if (greeting) greeting.textContent = `Welcome back, ${user.name}. Here’s your trip and booking activity.`;
  await loadAdminDashboardData();

  // Setup Add Package Form
  const addPackageForm = document.getElementById("addPackageForm");
  if (addPackageForm) {
    addPackageForm.addEventListener("submit", handleAddPackage);
  }

  const addStaffForm = document.getElementById("addStaffForm");
  if (addStaffForm) {
    addStaffForm.addEventListener("submit", handleAddStaff);
  }
}

async function loadAdminDashboardData() {
  await loadAdminStaff();
  await Promise.all([loadAdminPackages(), loadAdminBookings()]);
}

// Switch between Admin Tabs
function switchAdminTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"));
  document.querySelectorAll(".admin-workspace .tab-content").forEach((content) => content.classList.remove("active"));
  const tabButton = document.getElementById(`tabBtn${tabName.charAt(0).toUpperCase()}${tabName.slice(1)}`);
  const tabContent = document.getElementById(`${tabName}Tab`);
  if (tabButton && tabContent) {
    tabButton.classList.add("active");
    tabContent.classList.add("active");
  }
}

async function loadAdminStaff() {
  const roster = document.getElementById("adminStaffRoster");
  if (roster) roster.innerHTML = `<div class="roster-empty">Loading staff...</div>`;

  try {
    const response = await apiFetch(`${API_BASE_URL}/users/staff`);
    if (!response.ok) {
      const message = await response.text();
      if (response.status === 401) {
        throw new Error("Admin session expired. Sign in again to load and manage staff accounts.");
      }
      if (response.status === 403) {
        throw new Error("This account is not authorized to manage staff. Sign in as an administrator.");
      }
      throw new Error(message || "Could not load staff members.");
    }
    adminStaff = await response.json();
    const countLabel = document.getElementById("staffCountLabel");
    if (countLabel) {
      const activeCount = adminStaff.filter((staff) => staff.active !== false).length;
      countLabel.textContent = `${activeCount} active · ${adminStaff.length} total`;
    }
    renderAdminStaffRoster();
  } catch (err) {
    console.error("Error loading admin staff:", err);
    adminStaff = [];
    if (roster) roster.innerHTML = `<div class="roster-empty">Unable to load staff. Refresh the page and try again.</div>`;
    showAlert("adminAlertContainer", err.message, "error");
  }
}

function renderAdminStaffRoster() {
  const roster = document.getElementById("adminStaffRoster");
  if (!roster) return;
  if (adminStaff.length === 0) {
    roster.innerHTML = `<div class="roster-empty">No staff yet. Add a staff member above to start assigning trips.</div>`;
    return;
  }

  roster.innerHTML = adminStaff.map((staff) => {
    const initials = staff.name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
    const assignedBookings = adminBookings.filter((booking) =>
      String(booking.staffInCharge?.id || "") === String(staff.id)
    );
    const progressUpdateCount = adminBookings.reduce((count, booking) =>
      count + (booking.progressUpdates || []).filter((update) => String(update.staff?.id || "") === String(staff.id)).length,
    0);
    const assignedTrips = assignedBookings.map((booking) => {
      const pkg = booking.travelPackage || {};
      const badgeClass = booking.status === "CANCELLED" ? "badge-cancelled" : "badge-confirmed";
      const packageName = pkg.active === false ? `${pkg.name || "Travel package"} (deleted)` : pkg.name || "Travel package";
      return `
        <li class="staff-assignment-item">
          <span><strong>${escapeHtml(packageName)}</strong><small>${escapeHtml(pkg.destination || "Destination")} · ${escapeHtml(booking.travelDate || "Date not set")}</small></span>
          <span class="badge ${badgeClass}">${escapeHtml(booking.status || "CONFIRMED")}</span>
        </li>
      `;
    }).join("");
    return `
      <article class="staff-roster-card" data-staff-id="${Number(staff.id)}">
        <div class="staff-roster-identity">
          <div class="staff-avatar">${escapeHtml(initials)}</div>
          <div>
            <div class="staff-roster-name">${escapeHtml(staff.name)}</div>
            <div class="staff-roster-email">${escapeHtml(staff.email)} · ${escapeHtml(staff.phone)}</div>
          </div>
          <span class="roster-count">${staff.active === false ? "Deleted · " : ""}${assignedBookings.length} trips · ${progressUpdateCount} updates</span>
        </div>
        <div class="staff-assignment-list">
          ${assignedBookings.length ? `<ul>${assignedTrips}</ul>` : `<p>No trips assigned yet. Assign this staff member from the trip board below.</p>`}
        </div>
        <div class="staff-roster-actions">
          ${staff.active === false ? `<span class="badge badge-cancelled">Deleted</span>` : `
            <button class="btn btn-outline btn-sm" type="button" aria-controls="staff-edit-${Number(staff.id)}" aria-expanded="false" onclick="toggleStaffEditor(${Number(staff.id)})">Edit details</button>
            <button class="btn btn-danger btn-sm" type="button" onclick="deleteStaffMember(${Number(staff.id)})">Delete staff</button>
          `}
        </div>
        <p id="staff-delete-feedback-${Number(staff.id)}" class="staff-delete-feedback" aria-live="polite" hidden></p>
        <div id="staff-edit-${Number(staff.id)}" class="staff-edit-details" hidden>
          <form class="staff-edit-form" onsubmit="updateStaffProfile(event, ${Number(staff.id)})">
            <label>Name<input name="name" required></label>
            <label>Email<input name="email" type="email" required></label>
            <label>Phone<input name="phone" type="tel" required></label>
            <label>New password<input name="password" type="password" minlength="6" placeholder="Leave blank to keep current"></label>
            <button class="btn btn-primary btn-sm" type="submit">Save staff details</button>
          </form>
        </div>
      </article>
    `;
  }).join("");

  roster.querySelectorAll(".staff-roster-card").forEach((card) => {
    const staff = adminStaff.find((person) => String(person.id) === card.dataset.staffId);
    if (!staff) return;
    card.querySelector("input[name='name']").value = staff.name;
    card.querySelector("input[name='email']").value = staff.email;
    card.querySelector("input[name='phone']").value = staff.phone;
  });
}

function toggleStaffEditor(staffId) {
  const editor = document.getElementById(`staff-edit-${staffId}`);
  if (!editor) return;
  editor.hidden = !editor.hidden;
  const button = document.querySelector(`[aria-controls="staff-edit-${staffId}"]`);
  if (button) button.setAttribute("aria-expanded", String(!editor.hidden));
}

function showStaffDeleteFeedback(staffId, message) {
  const feedback = document.getElementById(`staff-delete-feedback-${staffId}`);
  if (!feedback) return;
  feedback.textContent = message;
  feedback.classList.add("is-error");
  feedback.hidden = false;
  feedback.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteStaffMember(staffId) {
  const staff = adminStaff.find((person) => String(person.id) === String(staffId));
  if (!staff) return;

  const assignedCount = adminBookings.filter((booking) =>
    String(booking.staffInCharge?.id || "") === String(staffId)
  ).length;
  const progressCount = adminBookings.reduce((count, booking) =>
    count + (booking.progressUpdates || []).filter((update) => String(update.staff?.id || "") === String(staffId)).length,
  0);
  const historyMessage = progressCount > 0
    ? ` ${progressCount} saved progress update${progressCount === 1 ? "" : "s"} will be kept under ${staff.name}'s name.`
    : "";
  const tripMessage = assignedCount > 0
    ? ` ${assignedCount} booking${assignedCount === 1 ? "" : "s"} will keep this staff member's name in their history.`
    : "";
  if (!window.confirm(`Delete the staff account for ${staff.name}? Their sign-in will be removed.${tripMessage}${historyMessage}`)) {
    return;
  }

  const feedback = document.getElementById(`staff-delete-feedback-${staffId}`);
  if (feedback) {
    feedback.hidden = true;
    feedback.classList.remove("is-error");
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/users/staff/${staffId}`, { method: "DELETE" });
    if (!response.ok) {
      let message = await response.text();
      if (response.status === 404 || response.status === 405) {
        message = "Restart the Spring Boot backend to load the staff deletion API, then try again.";
      } else if (response.status === 401 || response.status === 403) {
        message = "Your admin session is not authorized to delete staff. Sign in again as admin.";
      }
      throw new Error(message || "Could not delete this staff account.");
    }
    await loadAdminStaff();
    await loadAdminBookings();
    renderAdminStaffRoster();
    showAlert("adminAlertContainer", `Staff account for ${staff.name} was deleted.`, "success");
  } catch (error) {
    showStaffDeleteFeedback(staffId, error.message);
    showAlert("adminAlertContainer", error.message, "error");
  }
}

async function updateStaffProfile(event, staffId) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const updates = Object.fromEntries(new FormData(form).entries());
  button.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE_URL}/users/staff/${staffId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not update staff details.");
    }
    const updatedStaff = await response.json();
    adminStaff = adminStaff.map((staff) => String(staff.id) === String(staffId) ? updatedStaff : staff);
    renderAdminStaffRoster();
    await loadAdminBookings();
    showAlert("adminAlertContainer", `Staff details saved for ${updatedStaff.name}.`, "success");
  } catch (error) {
    showAlert("adminAlertContainer", error.message, "error");
  } finally {
    button.disabled = false;
  }
}

async function handleAddStaff(event) {
  event.preventDefault();
  const form = document.getElementById("addStaffForm");
  const submitButton = form.querySelector("button[type='submit']");
  const staff = {
    name: document.getElementById("staffName").value.trim(),
    email: document.getElementById("staffEmail").value.trim(),
    phone: document.getElementById("staffPhone").value.trim(),
    password: document.getElementById("staffPassword").value
  };

  submitButton.disabled = true;
  submitButton.textContent = "Adding...";
  try {
    const response = await apiFetch(`${API_BASE_URL}/users/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staff)
    });
    if (!response.ok) {
      const message = await response.text();
      if (response.status === 401) {
        throw new Error("Your admin session expired. Sign in again, then add the staff account.");
      }
      if (response.status === 403) {
        throw new Error("Only an administrator can create staff accounts. Sign in with an admin account.");
      }
      if (response.status === 404 || response.status === 405) {
        throw new Error("The staff creation API is unavailable. Restart the Spring Boot backend and try again.");
      }
      throw new Error(message || `Could not create the staff account (HTTP ${response.status}).`);
    }
    form.reset();
    await loadAdminStaff();
    await loadAdminBookings();
    showAlert("adminAlertContainer", `${staff.name} has been added and is ready for trip assignment.`, "success");
  } catch (err) {
    showAlert("adminAlertContainer", err.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Add staff";
  }
}

function toggleStaffPassword() {
  const input = document.getElementById("staffPassword");
  const button = input?.parentElement.querySelector(".staff-password-control button");
  if (!input || !button) return;
  const showPassword = input.type === "password";
  input.type = showPassword ? "text" : "password";
  button.textContent = showPassword ? "Hide" : "Show";
  button.setAttribute("aria-pressed", String(showPassword));
}

// Load packages table in admin dashboard
async function loadAdminPackages() {
  const tableBody = document.getElementById("adminPackagesTableBody");
  if (!tableBody) return;

  try {
    const response = await apiFetch(`${API_BASE_URL}/packages/admin/all`);
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not load travel packages.");
    }
    const packages = await response.json();
    adminPackageRecords = packages;

    const countElem = document.getElementById("totalPackagesCount");
    if (countElem) countElem.textContent = packages.filter((pkg) => pkg.active !== false).length;

    if (packages.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="table-empty">No packages available.</td></tr>`;
      return;
    }

    tableBody.innerHTML = packages
      .map(
        (pkg) => `
        <tr>
          <td>#${pkg.id}</td>
          <td><strong>${escapeHtml(pkg.name)}</strong></td>
          <td>📍 ${escapeHtml(pkg.destination)}</td>
          <td>⏱ ${escapeHtml(pkg.duration)}</td>
          <td>
            ${getPackageItinerary(pkg).places.split(/\r?\n/).map((place) => place.trim()).filter(Boolean).map((place) => `<span>${escapeHtml(place)}</span>`).join(", ") || '<span class="package-no-places">No places added</span>'}
          </td>
          <td>${[
            pkg.familyFriendly ? "Family-friendly" : "",
            pkg.groupTrip ? "Group trip" : "",
            Number(pkg.discountPercent) > 0 ? `${Number(pkg.discountPercent)}% offer` : ""
          ].filter(Boolean).map(escapeHtml).join(" · ") || "—"}</td>
          <td><strong style="color:var(--secondary-color);">${formatCurrency(pkg.price)}</strong></td>
          <td><span class="badge ${pkg.active === false ? "badge-cancelled" : "badge-confirmed"}">${pkg.active === false ? "Deleted" : "Active"}</span></td>
          <td>
            ${pkg.active === false ? "" : `
              <button class="btn btn-outline btn-sm" onclick="startPackageEdit(${pkg.id})">Edit package</button>
              <button class="btn btn-danger btn-sm" onclick="deletePackage(${pkg.id})">Delete</button>
            `}
          </td>
        </tr>
      `
      )
      .join("");
  } catch (err) {
    console.error("Error loading admin packages:", err);
    tableBody.innerHTML = `<tr><td colspan="9" class="table-empty">${escapeHtml(err.message)}</td></tr>`;
    showAlert("adminAlertContainer", err.message, "error");
  }
}

function startPackageEdit(id) {
  const pkg = adminPackageRecords.find((item) => String(item.id) === String(id));
  const form = document.getElementById("addPackageForm");
  if (!pkg || pkg.active === false || !form) return;

  editingPackageId = pkg.id;
  document.getElementById("pkgName").value = pkg.name || "";
  document.getElementById("pkgDestination").value = pkg.destination || "";
  document.getElementById("pkgDuration").value = pkg.duration || "";
  document.getElementById("pkgPrice").value = Number(pkg.price) || "";
  document.getElementById("pkgDiscountPercent").value = Number(pkg.discountPercent) || 0;
  document.getElementById("pkgFamilyFriendly").checked = Boolean(pkg.familyFriendly);
  document.getElementById("pkgGroupTrip").checked = Boolean(pkg.groupTrip);
  document.getElementById("pkgPlaces").value = getPackageItinerary(pkg).places;
  document.getElementById("pkgPlaceImages").value = getPackageItinerary(pkg).placeImages;
  document.getElementById("pkgPlaceImageSources").value = getPackageItinerary(pkg).placeImageSources;
  document.getElementById("pkgDescription").value = pkg.description || "";
  document.getElementById("packageFormHeading").textContent = `Edit package #${pkg.id}`;
  document.getElementById("packageFormSubmit").textContent = "Save package changes";
  document.getElementById("cancelPackageEditButton").hidden = false;
  switchAdminTab("packages");
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelPackageEdit() {
  editingPackageId = null;
  const form = document.getElementById("addPackageForm");
  if (form) form.reset();
  const heading = document.getElementById("packageFormHeading");
  const submitButton = document.getElementById("packageFormSubmit");
  const cancelButton = document.getElementById("cancelPackageEditButton");
  if (heading) heading.textContent = "Add a travel package";
  if (submitButton) submitButton.textContent = "＋ Add package";
  if (cancelButton) cancelButton.hidden = true;
}

// Handle adding and editing packages
async function handleAddPackage(e) {
  e.preventDefault();

  const name = document.getElementById("pkgName").value.trim();
  const destination = document.getElementById("pkgDestination").value.trim();
  const duration = document.getElementById("pkgDuration").value.trim();
  const price = parseFloat(document.getElementById("pkgPrice").value);
  const description = document.getElementById("pkgDescription").value.trim();
  const places = document.getElementById("pkgPlaces").value.trim();
  const placeImages = document.getElementById("pkgPlaceImages").value.trim();
  const placeImageSources = document.getElementById("pkgPlaceImageSources").value.trim();
  const discountPercent = Number(document.getElementById("pkgDiscountPercent").value);
  const familyFriendly = document.getElementById("pkgFamilyFriendly").checked;
  const groupTrip = document.getElementById("pkgGroupTrip").checked;

  if (!name || !destination || !duration || !Number.isFinite(price) || price <= 0) {
    showAlert("adminAlertContainer", "Please fill in all package fields.", "error");
    return;
  }
  if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 90) {
    showAlert("adminAlertContainer", "Offer discount must be between 0 and 90 percent.", "error");
    return;
  }

  const payload = {
    name, destination, duration, price, description, places, placeImages, placeImageSources,
    discountPercent, familyFriendly, groupTrip
  };
  const submitButton = document.getElementById("packageFormSubmit");
  submitButton.disabled = true;

  try {
    const response = await apiFetch(`${API_BASE_URL}/packages${editingPackageId ? `/${editingPackageId}` : ""}`, {
      method: editingPackageId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Could not ${editingPackageId ? "update" : "add"} package.`);
    }

    const wasEditing = editingPackageId !== null;
    cancelPackageEdit();
    showAlert("adminAlertContainer", `Package "${name}" ${wasEditing ? "updated" : "added"} successfully.`, "success");
    await Promise.all([loadAdminPackages(), loadAdminBookings()]);
  } catch (err) {
    showAlert("adminAlertContainer", err.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

// Delete Package
async function deletePackage(id) {
  const pkg = adminPackageRecords.find((item) => String(item.id) === String(id));
  if (!pkg || pkg.active === false) return;
  if (!confirm(`Delete "${pkg.name}"? It will be hidden from package browsing, while existing bookings keep its details.`)) {
    return;
  }

  try {
    const response = await apiFetch(`${API_BASE_URL}/packages/${id}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not delete this package.");
    }

    showAlert("adminAlertContainer", `"${pkg.name}" was deleted. Existing booking records remain in the history.`, "success");
    await Promise.all([loadAdminPackages(), loadAdminBookings()]);
  } catch (err) {
    showAlert("adminAlertContainer", err.message, "error");
  }
}

// Load all bookings in admin dashboard
async function loadAdminBookings() {
  const tableBody = document.getElementById("adminBookingsTableBody");
  if (!tableBody) return;

  const user = getCurrentUser();
  if (!user || user.role !== "ADMIN") return;

  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings`);
    if (!response.ok) {
      const message = await response.text();
      if (response.status === 401) {
        throw new Error("Admin session expired. Sign in again to load trip assignments.");
      }
      if (response.status === 403) {
        throw new Error("This account is not authorized to view all bookings. Sign in as an administrator.");
      }
      throw new Error(message || "Could not fetch bookings.");
    }
    const bookings = await response.json();
    adminBookings = bookings;
    renderAdminStaffRoster();

    const countElem = document.getElementById("totalBookingsCount");
    if (countElem) countElem.textContent = bookings.length;

    const confirmedBookings = bookings.filter((booking) => booking.status === "CONFIRMED");
    const assignedTrips = confirmedBookings.filter((booking) =>
      booking.staffInCharge && booking.staffInCharge.active !== false
    );
    const assignedCount = document.getElementById("assignedTripsCount");
    if (assignedCount) assignedCount.textContent = assignedTrips.length;
    const unassignedCount = document.getElementById("unassignedTripsCount");
    if (unassignedCount) unassignedCount.textContent = confirmedBookings.length - assignedTrips.length;

    const totalRev = confirmedBookings
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const revElem = document.getElementById("totalRevenueAmount");
    if (revElem) revElem.textContent = formatCurrency(totalRev);
    const paidTotal = confirmedBookings
      .filter((b) => b.paymentStatus === "PAID")
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const paidRevElem = document.getElementById("paidRevenueAmount");
    if (paidRevElem) paidRevElem.textContent = formatCurrency(paidTotal);

    renderAdminTrips(bookings);
    if (bookings.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" class="table-empty">No bookings recorded yet.</td></tr>`;
      return;
    }

    tableBody.innerHTML = bookings
      .map((b) => {
        const userName = b.user ? b.user.name : "N/A";
        const userEmail = b.user ? b.user.email : "N/A";
        const pkgName = b.travelPackage
          ? `${b.travelPackage.name}${b.travelPackage.active === false ? " (deleted)" : ""}`
          : "N/A";
        const badgeClass = b.status === "CANCELLED" ? "badge-cancelled" : "badge-confirmed";
        const paymentStatus = b.paymentStatus || "UNPAID";
        const travelers = (b.travelers || []).map((traveler) => `
          <li>
            <strong>${escapeHtml(traveler.name)}</strong><br>
            ${escapeHtml(traveler.email)}<br>
            ${escapeHtml(traveler.phone)}
          </li>
        `).join("");

        return `
          <tr>
            <td><span class="booking-title">#${b.id}</span></td>
            <td>
              <strong class="booking-title">${escapeHtml(userName)}</strong>
              <div class="table-subtitle">${escapeHtml(userEmail)}</div>
            </td>
            <td>${escapeHtml(pkgName)}</td>
            <td>${escapeHtml(b.travelDate)}</td>
            <td>
              <details>
                <summary>${b.numberOfPersons} traveler${b.numberOfPersons === 1 ? "" : "s"}</summary>
                <ol style="padding-left:22px;">${travelers || "<li>No traveler details recorded</li>"}</ol>
              </details>
            </td>
            <td><strong>${formatCurrency(b.totalAmount)}</strong></td>
            <td><span class="badge ${badgeClass}">${escapeHtml(b.status)}</span></td>
            <td>
              <label for="payment-status-${b.id}" style="display:block;margin-bottom:4px;">${escapeHtml(paymentStatus)}</label>
              <select id="payment-status-${b.id}" aria-label="Payment status for booking ${b.id}">
                <option value="UNPAID" ${paymentStatus === "UNPAID" ? "selected" : ""}>Unpaid</option>
                <option value="PAID" ${paymentStatus === "PAID" ? "selected" : ""}>Paid</option>
              </select>
              <button class="btn btn-primary btn-sm" style="margin-top:6px;" onclick="updateBookingPaymentStatus(${b.id})">Save</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading admin bookings:", err);
    tableBody.innerHTML = `<tr><td colspan="8" class="table-empty">${escapeHtml(err.message)}</td></tr>`;
    const tripsBody = document.getElementById("adminTripsTableBody");
    const overviewBody = document.getElementById("adminOverviewTripsBody");
    if (tripsBody) tripsBody.innerHTML = `<tr><td colspan="6" class="table-empty">${escapeHtml(err.message)}</td></tr>`;
    if (overviewBody) overviewBody.innerHTML = `<tr><td colspan="5" class="table-empty">${escapeHtml(err.message)}</td></tr>`;
    showAlert("adminAlertContainer", err.message, "error");
  }
}

function renderAdminTrips(bookings) {
  const tripsBody = document.getElementById("adminTripsTableBody");
  const overviewBody = document.getElementById("adminOverviewTripsBody");
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateOrder = String(a.travelDate || "").localeCompare(String(b.travelDate || ""));
    return dateOrder || Number(a.id) - Number(b.id);
  });

  if (tripsBody) {
    if (sortedBookings.length === 0) {
      tripsBody.innerHTML = `<tr><td colspan="6" class="table-empty">No trips to assign yet. Confirmed customer bookings will appear here.</td></tr>`;
    } else {
      tripsBody.innerHTML = sortedBookings.map((booking) => {
        const pkg = booking.travelPackage || {};
        const customer = booking.user || {};
        const cancelled = booking.status === "CANCELLED";
        const badgeClass = cancelled ? "badge-cancelled" : "badge-confirmed";
        const assignedName = booking.staffInCharge
          ? `${booking.staffInCharge.name}${booking.staffInCharge.active === false ? " (deleted)" : ""}`
          : "";
        const progressUpdates = booking.progressUpdates || [];
        const latestProgress = progressUpdates[progressUpdates.length - 1];
        const options = adminStaff.filter((staff) => staff.active !== false).map((staff) => `
          <option value="${staff.id}" ${String(staff.id) === String(booking.staffInCharge?.id || "") ? "selected" : ""}>
            ${escapeHtml(staff.name)}
          </option>
        `).join("");
        const deletedAssignedStaff = booking.staffInCharge?.active === false
          ? `<option value="${Number(booking.staffInCharge.id)}" selected disabled>Deleted staff: ${escapeHtml(booking.staffInCharge.name)}</option>`
          : "";
        return `
          <tr>
            <td>
              <div class="booking-title">${escapeHtml(pkg.name || "Travel package")}${pkg.active === false ? " (deleted)" : ""}</div>
              <div class="table-subtitle">${escapeHtml(pkg.destination || "Destination")} · Booking #${booking.id}</div>
            </td>
            <td>${escapeHtml(booking.travelDate || "Not set")}</td>
            <td>
              <div class="booking-title">${escapeHtml(customer.name || "N/A")}</div>
              <div class="table-subtitle">${escapeHtml(customer.email || "")}</div>
            </td>
            <td>${booking.numberOfPersons || 0}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(booking.status || "CONFIRMED")}</span></td>
            <td>
              <select id="trip-staff-${booking.id}" aria-label="Staff in-charge for booking ${booking.id}"
                onchange="updateTripStaff(${booking.id})" ${cancelled || !adminStaff.some((staff) => staff.active !== false) ? "disabled" : ""}>
                <option value="">${adminStaff.some((staff) => staff.active !== false) ? "Choose staff in-charge" : "Add active staff first"}</option>
                ${deletedAssignedStaff}
                ${options}
              </select>
              ${assignedName ? `<div class="table-subtitle">Current in-charge: ${escapeHtml(assignedName)}</div>` : ""}
              ${latestProgress ? `
                <div class="admin-latest-progress">
                  <strong>${escapeHtml(latestProgress.checkpoint)}</strong>
                  <span>${escapeHtml(latestProgress.location || "GPS location")}</span>
                  <span class="badge ${latestProgress.reached ? "badge-confirmed" : "badge-pending"}">${latestProgress.reached ? "Reached" : "En route"}</span>
                  <time>${escapeHtml(latestProgress.reportedAt ? new Date(latestProgress.reportedAt).toLocaleString() : "Time unavailable")}</time>
                </div>
              ` : `<div class="table-subtitle">No staff progress reported yet.</div>`}
              ${progressUpdates.length ? `
                <details class="admin-progress-history">
                  <summary>View ${progressUpdates.length} update${progressUpdates.length === 1 ? "" : "s"}</summary>
                  <ol>
                    ${progressUpdates.map((update) => {
                      const hasCoordinates = update.latitude !== null && update.latitude !== undefined
                        && update.longitude !== null && update.longitude !== undefined
                        && Number.isFinite(Number(update.latitude)) && Number.isFinite(Number(update.longitude));
                      const mapLink = hasCoordinates
                        ? `https://www.google.com/maps?q=${Number(update.latitude)},${Number(update.longitude)}`
                        : "";
                      return `
                        <li>
                          <strong>${escapeHtml(update.checkpoint)}</strong>
                          <span>${escapeHtml(update.location || "GPS location")} · ${update.reached ? "Reached" : "En route"}</span>
                          <span>${escapeHtml(update.staff?.name || update.staffName || "Staff account removed")}${update.staff?.active === false ? " (deleted)" : ""}</span>
                          ${mapLink ? `<a href="${mapLink}" target="_blank" rel="noopener noreferrer">Map</a>` : ""}
                          <time>${escapeHtml(update.reportedAt ? new Date(update.reportedAt).toLocaleString() : "Time unavailable")}</time>
                        </li>
                      `;
                    }).join("")}
                  </ol>
                </details>
              ` : ""}
            </td>
          </tr>
        `;
      }).join("");
    }
  }

  if (!overviewBody) return;
  const currentDate = new Date();
  const today = [
    currentDate.getFullYear(),
    String(currentDate.getMonth() + 1).padStart(2, "0"),
    String(currentDate.getDate()).padStart(2, "0")
  ].join("-");
  const upcoming = sortedBookings
    .filter((booking) => booking.status === "CONFIRMED" && String(booking.travelDate || "") >= today)
    .slice(0, 5);
  if (upcoming.length === 0) {
    overviewBody.innerHTML = `<tr><td colspan="5" class="table-empty">No upcoming confirmed trips right now.</td></tr>`;
    return;
  }

  overviewBody.innerHTML = upcoming.map((booking) => {
    const pkg = booking.travelPackage || {};
    const staff = booking.staffInCharge;
    return `
      <tr>
        <td>
          <div class="booking-title">${escapeHtml(pkg.name || "Travel package")}${pkg.active === false ? " (deleted)" : ""}</div>
          <div class="table-subtitle">${escapeHtml(pkg.destination || "Destination")} · Booking #${booking.id}</div>
        </td>
        <td>${escapeHtml(booking.travelDate || "Not set")}</td>
        <td>${booking.numberOfPersons || 0}</td>
        <td>${staff ? `${escapeHtml(staff.name)}${staff.active === false ? " (deleted)" : ""}` : '<span class="badge badge-pending">Unassigned</span>'}</td>
        <td><span class="badge badge-confirmed">${escapeHtml(booking.status)}</span></td>
      </tr>
    `;
  }).join("");
}

async function updateTripStaff(bookingId) {
  const user = getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    showAlert("adminAlertContainer", "Only an administrator can assign trip staff.", "error");
    return;
  }

  const staffSelect = document.getElementById(`trip-staff-${bookingId}`);
  if (!staffSelect) return;
  staffSelect.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings/${bookingId}/staff`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: staffSelect.value ? Number(staffSelect.value) : null })
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not update the trip's staff in-charge.");
    }
    showAlert("adminAlertContainer", `Staff assignment saved for booking #${bookingId}.`, "success");
    await loadAdminBookings();
  } catch (err) {
    showAlert("adminAlertContainer", err.message, "error");
    await loadAdminBookings();
  }
}

async function updateBookingPaymentStatus(bookingId) {
  const user = getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    showAlert("adminAlertContainer", "Only an administrator can update payment status.", "error");
    return;
  }

  const statusSelect = document.getElementById(`payment-status-${bookingId}`);
  if (!statusSelect) return;

  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings/${bookingId}/payment-status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentStatus: statusSelect.value })
    });
    if (!response.ok) {
      const errorMessage = await response.text();
      throw new Error(errorMessage || "Could not update payment status.");
    }

    showAlert("adminAlertContainer", `Payment marked ${statusSelect.value.toLowerCase()} for booking #${bookingId}.`, "success");
    await loadAdminBookings();
  } catch (err) {
    showAlert("adminAlertContainer", err.message, "error");
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("bookingForm")) {
    initBookingPage();
  }
  if (document.getElementById("myBookingsContainer")) {
    loadMyBookings();
  }
  if (document.getElementById("adminSection")) {
    initAdminDashboard();
    window.setInterval(() => {
      if (document.visibilityState === "visible") loadAdminDashboardData();
    }, 30000);
  }
});

window.addEventListener("focus", () => {
  if (document.visibilityState !== "visible") return;
  const packageSelect = document.getElementById("packageSelect");
  if (packageSelect) loadBookingPackageOptions(packageSelect);
  if (document.getElementById("myBookingsContainer")) loadMyBookings();
});
