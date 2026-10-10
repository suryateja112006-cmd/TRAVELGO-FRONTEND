/* ===================================================================
   TravelGo - Authentication JavaScript (auth.js)
   Handles user registration, login, and authorization validation
   =================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  // --- Registration Handler ---
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (!name || !email || !phone || !password) {
        showAlert("alertContainer", "Please fill in all required fields.", "error");
        return;
      }

      if (password !== confirmPassword) {
        showAlert("alertContainer", "Passwords do not match!", "error");
        return;
      }

      const submitBtn = registerForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Registering...";

      try {
        const response = await apiFetch(`${API_BASE_URL}/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name,
            email: email,
            phone: phone,
            password: password,
            role: "USER"
          })
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          throw new Error(errorMsg || "Registration failed. Email might already be registered.");
        }

        const data = await response.json();
        showAlert("alertContainer", "Registration successful! Redirecting to login...", "success");
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } catch (err) {
        showAlert("alertContainer", err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register";
      }
    });
  }

  // --- Login Handler ---
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!email || !password) {
        showAlert("alertContainer", "Please enter your email and password.", "error");
        return;
      }

      const submitBtn = loginForm.querySelector("button[type='submit']");
      const requiredRole = loginForm.dataset.loginRole || "USER";
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing in...";

      try {
        const loginEndpoint = requiredRole === "ADMIN"
          ? "admin-login"
          : requiredRole === "STAFF" ? "staff-login" : "login";
        const response = await apiFetch(`${API_BASE_URL}/users/${loginEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        if (!response.ok) {
          const errorMsg = await response.text();
          if (requiredRole !== "USER" && response.status === 404) {
            throw new Error(`The ${requiredRole.toLowerCase()} login endpoint was not found. Restart the backend, then try again.`);
          }
          if (requiredRole === "STAFF" && response.status === 401) {
            throw new Error("Staff email or password did not match. Ask your administrator to verify the email or reset your password in Trips & staff in-charge.");
          }
          throw new Error(errorMsg || "Invalid email or password.");
        }

        const user = await response.json();
        if (user.role !== requiredRole) {
          throw new Error(requiredRole === "ADMIN"
            ? "This account is not an administrator. Use customer login."
            : requiredRole === "STAFF"
              ? "This account is not a staff account. Ask your administrator to check its role."
              : "Administrators and staff must use their designated login pages.");
        }
        setCurrentUser(user);
        showAlert("alertContainer", `Welcome, ${user.name}! Redirecting...`, "success");

        setTimeout(() => {
          const destination = requiredRole === "ADMIN" ? "/admin" : requiredRole === "STAFF" ? "/staff" : "packages.html";
          window.location.href = destination;
        }, 700);
      } catch (err) {
        showAlert("alertContainer", err.message, "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = requiredRole === "ADMIN"
          ? "Sign In as Administrator"
          : requiredRole === "STAFF" ? "Sign In as Staff" : "Login";
      }
    });
  }
});
