function renderStaffTrips(bookings) {
  const container = document.getElementById("staffTripsContainer");
  if (!container) return;

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
  const upcoming = bookings.filter((booking) => booking.status === "CONFIRMED" && String(booking.travelDate || "") >= today);
  const travelerCount = bookings.reduce((sum, booking) => sum + (booking.travelers || []).length, 0);

  document.getElementById("staffTripCount").textContent = bookings.length;
  document.getElementById("staffUpcomingCount").textContent = upcoming.length;
  document.getElementById("staffTravelerCount").textContent = travelerCount;

  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state staff-empty-state">
        <h3>No trips assigned yet</h3>
        <p>Your administrator's trip assignments will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = bookings.map((booking) => {
    const pkg = booking.travelPackage || {};
    const travelers = booking.travelers || [];
    const itinerary = getPackageItinerary(pkg).places
      .split(/\r?\n/)
      .map((place) => place.trim())
      .filter(Boolean);
    const progressUpdates = booking.progressUpdates || [];
    const reachedPoints = new Set(progressUpdates.filter((update) => update.reached).map((update) => update.checkpoint));
    const nextCheckpoint = itinerary.find((place) => !reachedPoints.has(place));
    const statusClass = booking.status === "CANCELLED" ? "badge-cancelled" : "badge-confirmed";
    const bookingUser = booking.user || {};

    return `
      <article class="staff-trip-card">
        <div class="staff-trip-topline">
          <span class="staff-trip-destination">${escapeHtml(pkg.destination || "Assigned destination")}</span>
          <span class="badge ${pkg.active === false ? "badge-cancelled" : statusClass}">${pkg.active === false ? "Package deleted" : escapeHtml(booking.status || "CONFIRMED")}</span>
        </div>
        <h3>${escapeHtml(pkg.name || "Travel package")}${pkg.active === false ? " (deleted)" : ""}</h3>
        <p class="staff-trip-description">${escapeHtml(pkg.description || "Package details are available from the itinerary.")}</p>

        <div class="staff-trip-facts">
          <div><span>Travel date</span><strong>${escapeHtml(booking.travelDate || "Not set")}</strong></div>
          <div><span>Duration</span><strong>${escapeHtml(pkg.duration || "Not provided")}</strong></div>
          <div><span>Travelers</span><strong>${travelers.length}</strong></div>
          <div><span>Booked by</span><strong>${escapeHtml(bookingUser.name || "Customer")}</strong></div>
        </div>

        ${itinerary.length ? `
          <div class="staff-trip-itinerary">
            <span class="staff-detail-label">PACKAGE STOPS</span>
            <p>${itinerary.map(escapeHtml).join(" · ")}</p>
          </div>
        ` : ""}

        <div class="staff-checkpoint-panel">
          <span class="staff-detail-label">NEXT CHECKPOINT</span>
          <strong>${escapeHtml(nextCheckpoint || "All package stops reached")}</strong>
          ${nextCheckpoint && booking.status !== "CANCELLED" ? `
            <form id="staff-progress-form-${Number(booking.id)}" class="staff-progress-form" onsubmit="reportTripProgress(event, ${Number(booking.id)})">
              <label for="progress-location-${Number(booking.id)}">Your current location</label>
              <input id="progress-location-${Number(booking.id)}" name="location" type="text" maxlength="255" placeholder="Enter your location" required>
              <input name="latitude" type="hidden">
              <input name="longitude" type="hidden">
              <div class="staff-progress-actions">
                <button class="btn btn-outline btn-sm" type="button" onclick="captureStaffLocation(${Number(booking.id)})">Use GPS</button>
                <label class="staff-reached-toggle"><input name="reached" type="checkbox"> I reached this point</label>
                <button class="btn btn-primary btn-sm" type="submit">Send update</button>
              </div>
              <span class="staff-location-status" id="location-status-${Number(booking.id)}" aria-live="polite"></span>
            </form>
          ` : ""}
        </div>

        ${progressUpdates.length ? `
          <details class="staff-progress-history">
            <summary>Progress history <span>${progressUpdates.length}</span></summary>
            <ol>
              ${progressUpdates.map((update) => {
                const hasCoordinates = update.latitude !== null && update.latitude !== undefined
                  && update.longitude !== null && update.longitude !== undefined
                  && Number.isFinite(Number(update.latitude)) && Number.isFinite(Number(update.longitude));
                const mapLink = hasCoordinates
                  ? `https://www.google.com/maps?q=${Number(update.latitude)},${Number(update.longitude)}`
                  : "";
                const reportedAt = update.reportedAt ? new Date(update.reportedAt).toLocaleString() : "Time unavailable";
                return `
                  <li>
                    <div><strong>${escapeHtml(update.checkpoint)}</strong><span class="staff-update-state ${update.reached ? "is-reached" : ""}">${update.reached ? "Reached" : "En route"}</span></div>
                    <span>${escapeHtml(update.location || "GPS location")}</span>
                    <span>${escapeHtml(update.staff?.name || update.staffName || "Staff account removed")}${update.staff?.active === false ? " (deleted)" : ""}</span>
                    ${mapLink ? `<a href="${mapLink}" target="_blank" rel="noopener noreferrer">View location map</a>` : ""}
                    <time>${escapeHtml(reportedAt)}</time>
                  </li>
                `;
              }).join("")}
            </ol>
          </details>
        ` : ""}

        <details class="staff-travelers">
          <summary>Traveler details <span>${travelers.length}</span></summary>
          ${travelers.length ? `
            <div class="staff-traveler-list">
              ${travelers.map((traveler, index) => `
                <div class="staff-traveler">
                  <span class="staff-traveler-number">${String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>${escapeHtml(traveler.name || "Traveler")}</strong>
                    <span>${escapeHtml(traveler.email || "Email not provided")}</span>
                    <span>${escapeHtml(traveler.phone || "Phone not provided")}</span>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<p class="staff-no-travelers">No traveler details were provided for this booking.</p>`}
        </details>

        ${pkg.id ? `<a class="staff-package-link" href="package-details.html?id=${encodeURIComponent(pkg.id)}">Open package details <span aria-hidden="true">↗</span></a>` : ""}
      </article>
    `;
  }).join("");
}

function captureStaffLocation(bookingId) {
  const form = document.getElementById(`staff-progress-form-${bookingId}`);
  const status = document.getElementById(`location-status-${bookingId}`);
  if (!form || !navigator.geolocation) {
    if (status) status.textContent = "GPS location is not available in this browser.";
    return;
  }

  if (status) status.textContent = "Getting your location...";
  navigator.geolocation.getCurrentPosition((position) => {
    form.elements.latitude.value = position.coords.latitude;
    form.elements.longitude.value = position.coords.longitude;
    if (!form.elements.location.value.trim()) form.elements.location.value = "GPS location";
    if (status) status.textContent = "GPS location captured.";
  }, () => {
    if (status) status.textContent = "Could not access GPS. Enter your location instead.";
  }, { enableHighAccuracy: true, timeout: 10000 });
}

async function reportTripProgress(event, bookingId) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector("button[type='submit']");
  const update = {
    location: form.elements.location.value.trim(),
    latitude: form.elements.latitude.value ? Number(form.elements.latitude.value) : null,
    longitude: form.elements.longitude.value ? Number(form.elements.longitude.value) : null,
    reached: form.elements.reached.checked
  };

  submitButton.disabled = true;
  try {
    const response = await apiFetch(`${API_BASE_URL}/bookings/${bookingId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update)
    });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || "Could not send the trip update.");
    }
    showAlert("staffAlertContainer", "Trip progress shared with the admin.", "success");
    await loadStaffTrips();
  } catch (error) {
    showAlert("staffAlertContainer", error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

async function loadStaffTrips() {
  const container = document.getElementById("staffTripsContainer");
  if (!container) return;

  const user = getCurrentUser();
  if (!user || user.role !== "STAFF") {
    window.location.replace("staff-login.html");
    return;
  }

  container.innerHTML = `
    <div class="empty-state staff-empty-state">
      <h3>Loading your trips...</h3>
      <p>Retrieving assignments from TravelGo.</p>
    </div>
  `;
  const greeting = document.getElementById("staffGreeting");

  try {
    const profileResponse = await apiFetch(`${API_BASE_URL}/users/me`);
    if (!profileResponse.ok) {
      if (profileResponse.status === 401) {
        removeCurrentUser();
        window.location.replace("staff-login.html");
        return;
      }
      const message = await profileResponse.text();
      throw new Error(message || "Could not refresh your staff profile.");
    }
    const refreshedUser = await profileResponse.json();
    setCurrentUser({ ...user, ...refreshedUser });
    updateNavbar();
    if (greeting) greeting.textContent = `Welcome, ${refreshedUser.name}. Here are the trips assigned to you.`;

    const response = await apiFetch(`${API_BASE_URL}/bookings/staff/${encodeURIComponent(user.id)}`);
    if (!response.ok) {
      if (response.status === 401) {
        removeCurrentUser();
        window.location.replace("staff-login.html");
        return;
      }
      const message = await response.text();
      throw new Error(message || "Could not load your assigned trips.");
    }
    renderStaffTrips(await response.json());
  } catch (error) {
    console.error("Error loading staff trips:", error);
    container.innerHTML = `
      <div class="empty-state staff-empty-state">
        <h3>Trips could not be loaded</h3>
        <p>${escapeHtml(error.message || "Check your connection and try again.")}</p>
        <button class="btn btn-outline" type="button" onclick="loadStaffTrips()">Try again</button>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("staffTripsContainer")) loadStaffTrips();
});

window.addEventListener("focus", () => {
  if (document.visibilityState === "visible" && document.getElementById("staffTripsContainer")) {
    loadStaffTrips();
  }
});
