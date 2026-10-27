
document.addEventListener("DOMContentLoaded", async () => {
  const API = "http://localhost:5000/api/bookings";
  const token = sessionStorage.getItem("token");

  const bookingsList = document.getElementById("bookingsList");
  const bookingsMessage = document.getElementById("bookingsMessage");
  const statusFilter = document.getElementById("statusFilter");
  const bookingSearch = document.getElementById("bookingSearch");

  let allBookings = [];

  function setCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function getClientName(booking) {
    const client = booking.client || {};
    return `${client.firstName || ""} ${client.lastName || ""}`.trim()
      || "Unknown customer";
  }

  function getServiceName(booking) {
    return booking.service?.serviceName ||
      booking.service?.name ||
      "Photography Session";
  }

  function formatDate(value) {
    if (!value) return "Not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Not set";

    return date.toLocaleDateString("en-PH", {
      timeZone: "UTC",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
    if (!match) return value || "Not set";

    const hour = Number(match[1]);

    return `${hour % 12 || 12}:${match[2]} ${
      hour < 12 ? "AM" : "PM"
    }`;
  }

  function addText(parent, tag, value, className = "") {
    const element = document.createElement(tag);
    element.textContent = value;

    if (className) element.className = className;

    parent.appendChild(element);
    return element;
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.replace("login.html");
      }

      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  }

  function updateCounters() {
    setCount("totalBookings", allBookings.length);

    setCount(
      "pendingBookings",
      allBookings.filter(b => b.status === "pending").length
    );

    setCount(
      "confirmedBookings",
      allBookings.filter(b => b.status === "confirmed").length
    );

    setCount(
      "completedBookings",
      allBookings.filter(b => b.status === "completed").length
    );
  }

  async function changeBookingStatus(booking, newStatus) {
    const actionNames = {
      confirmed: "approve",
      cancelled: "decline",
      completed: "complete"
    };

    const action = actionNames[newStatus];

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this booking for ${getClientName(booking)}?`
    );

    if (!confirmed) return;

    try {
      bookingsMessage.textContent = "Updating booking...";

      await apiRequest(`${API}/${booking._id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: newStatus
        })
      });

      await loadBookings();

      alert(`Booking ${newStatus} successfully!`);

    } catch (error) {
      bookingsMessage.textContent = error.message;
      alert(error.message);
    }
  }

  function createBookingCard(booking) {
    const card = document.createElement("div");
    card.className = "booking-card";

    addText(card, "h3", getServiceName(booking));

    const status = String(booking.status || "pending").toLowerCase();

    addText(
      card,
      "span",
      status.charAt(0).toUpperCase() + status.slice(1),
      `booking-status ${status}`
    );

    const details = document.createElement("div");
    details.className = "booking-details";

    addText(details, "div", `Customer: ${getClientName(booking)}`);

    addText(
      details,
      "div",
      `Email: ${booking.client?.email || "Not available"}`
    );

    addText(
      details,
      "div",
      `Date: ${formatDate(booking.bookingDate)}`
    );

    addText(
      details,
      "div",
      `Time: ${formatTime(booking.startTime)}`
    );

    addText(
      details,
      "div",
      `Location: ${booking.location || "Not set"}`
    );

    if (typeof booking.service?.price === "number") {
      addText(
        details,
        "div",
        `Price: ₱${booking.service.price.toLocaleString("en-PH")}`
      );
    }

    if (booking.notes) {
      addText(details, "div", `Notes: ${booking.notes}`);
    }

    card.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "booking-actions";

    function addAction(label, className, newStatus) {
      const button = addText(actions, "button", label, className);
      button.type = "button";

      button.addEventListener("click", async () => {
        const buttons = actions.querySelectorAll("button");
        buttons.forEach(btn => btn.disabled = true);

        try {
          await changeBookingStatus(booking, newStatus);
        } finally {
          buttons.forEach(btn => btn.disabled = false);
        }
      });
    }

    if (status === "pending") {
      addAction("✓ Approve", "gold-btn", "confirmed");
      addAction("✕ Decline", "outline-btn", "cancelled");
    }

    if (status === "confirmed") {
      addAction("✓ Mark as Completed", "gold-btn", "completed");
    }

    card.appendChild(actions);
    return card;
  }

  function renderBookings() {
    bookingsList.replaceChildren();

    const filter = statusFilter.value;
    const search = bookingSearch.value.trim().toLowerCase();

    const filteredBookings = allBookings.filter(booking => {
      const statusMatches =
        filter === "all" || booking.status === filter;

      const searchableText =
        `${getClientName(booking)} ${getServiceName(booking)}`.toLowerCase();

      return statusMatches && searchableText.includes(search);
    });

    if (filteredBookings.length === 0) {
      bookingsMessage.textContent = "No matching bookings found.";
      return;
    }

    bookingsMessage.textContent = "";

    filteredBookings.forEach(booking => {
      bookingsList.appendChild(createBookingCard(booking));
    });
  }

  async function loadBookings() {
    try {
      allBookings = await apiRequest(API);

      if (!Array.isArray(allBookings)) {
        throw new Error("Invalid bookings response.");
      }

      allBookings.sort((a, b) =>
        new Date(b.createdAt || b.bookingDate) -
        new Date(a.createdAt || a.bookingDate)
      );

      updateCounters();
      renderBookings();

    } catch (error) {
      console.error("Loading bookings failed:", error);
      bookingsMessage.textContent = error.message;
    }
  }

  // LOGOUT
  document.getElementById("logoutButton")
    .addEventListener("click", event => {
      event.preventDefault();
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.replace("login.html");
    });

  // CHECK ADMIN ACCESS
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  try {
    const auth = await apiRequest(
      "http://localhost:5000/api/auth/me"
    );

    const user = auth.user || auth;

    if (user.role !== "admin") {
      alert("Admin access only.");
      window.location.replace("user-dashboard.html");
      return;
    }

    const fullName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Admin";

    document.getElementById("adminName").textContent = fullName;

    const initials =
      `${(user.firstName || "A")[0]}${(user.lastName || "D")[0]}`.toUpperCase();

    document.querySelectorAll(".avatar").forEach(avatar => {
      avatar.textContent = initials;
    });

  } catch (error) {
    console.error("Admin authentication failed:", error);
    bookingsMessage.textContent = "Unable to verify admin access.";
    return;
  }

  statusFilter.addEventListener("change", renderBookings);
  bookingSearch.addEventListener("input", renderBookings);

  await loadBookings();
});
