
document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = "http://localhost:5000";
  const token = sessionStorage.getItem("token");

  const scheduleList = document.getElementById("todaySchedule");
  const pendingList = document.getElementById("pendingBookingsList");
  const recentList = document.getElementById("recentBookingsList");

  const scheduleMessage = document.getElementById("scheduleMessage");
  const pendingMessage = document.getElementById("pendingMessage");
  const recentMessage = document.getElementById("recentMessage");

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setStatus(id, value, success = false) {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = value;
    element.className = success ? "security-ok" : "";
  }

  function redirectToLogin() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.replace("login.html");
  }

  function getDateKey(date) {
    return String(date || "").slice(0, 10);
  }

  function getTodayKey() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const getPart = type =>
      parts.find(part => part.type === type)?.value;

    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  }

  function formatDate(value) {
    if (!value) return "Date not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not set";
    }

    return date.toLocaleDateString("en-PH", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function formatTime(value) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");

    if (!match) return value || "Time not set";

    const hour = Number(match[1]);

    return `${hour % 12 || 12}:${match[2]} ${
      hour < 12 ? "AM" : "PM"
    }`;
  }

  function getClientName(booking) {
    const client = booking.client || {};

    return `${client.firstName || ""} ${client.lastName || ""}`.trim()
      || "Client";
  }

  function getServiceName(booking) {
    return booking.service?.serviceName ||
      booking.service?.name ||
      "Photography Session";
  }

  function createBookingCard(booking) {
    const card = document.createElement("div");
    card.className = "booking";

    const details = document.createElement("div");

    const title = document.createElement("h4");
    title.textContent =
      `${getClientName(booking)} · ${getServiceName(booking)}`;

    const description = document.createElement("p");
    description.textContent =
      `${formatDate(booking.bookingDate)} · ` +
      `${formatTime(booking.startTime)} · ` +
      `${booking.location || "Location not set"}`;

    details.appendChild(title);
    details.appendChild(description);

    const status = document.createElement("span");
    const bookingStatus = booking.status || "pending";

    status.className =
      bookingStatus === "confirmed" ||
      bookingStatus === "completed"
        ? "status confirmed"
        : bookingStatus === "pending"
          ? "status pending"
          : "status info";

    status.textContent =
      bookingStatus.charAt(0).toUpperCase() +
      bookingStatus.slice(1);

    card.appendChild(details);
    card.appendChild(status);

    return card;
  }

  async function fetchWithAuth(path) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        redirectToLogin();
      }

      throw new Error(
        `Request failed (${response.status})`
      );
    }

    return response.json();
  }

  // SIGN OUT
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", event => {
      event.preventDefault();
      redirectToLogin();
    });
  }

  // CHECK LOGIN
  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    const authData = await fetchWithAuth("/api/auth/me");
    const admin = authData.user || authData;

    if (admin.role !== "admin") {
      alert("Admin access only.");
      window.location.replace("user-dashboard.html");
      return;
    }

    const fullName =
      `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
      || "Admin";

    setText("adminName", fullName);
    setText("adminGreeting", `Welcome, ${admin.firstName || "Admin"}.`);

    setStatus("authStatus", "✓ Authenticated", true);
    setStatus("roleStatus", "✓ Admin permissions active", true);

    const initials =
      `${(admin.firstName || "A").charAt(0)}` +
      `${(admin.lastName || "D").charAt(0)}`;

    document.querySelectorAll(".avatar").forEach(avatar => {
      avatar.textContent = initials.toUpperCase();
    });

  } catch (error) {
    console.error("Authentication error:", error);

    setStatus("authStatus", "Authentication failed");
    setStatus("roleStatus", "Access unavailable");

    return;
  }

  // LOAD BOOKINGS
  async function loadDashboard() {
    try {
      const bookings = await fetchWithAuth("/api/bookings");

      if (!Array.isArray(bookings)) {
        throw new Error("Invalid bookings response");
      }

      // A successful bookings request confirms the API responded,
      // but is not a separate database health check.
      setStatus("databaseStatus", "✓ Booking data loaded", true);
      setStatus("bookingSystemStatus", "✓ Connected", true);

      const today = getTodayKey();

      const todayBookings = bookings.filter(booking =>
        getDateKey(booking.bookingDate) === today &&
        booking.status !== "cancelled"
      );

      const pendingBookings = bookings.filter(booking =>
        booking.status === "pending"
      );

      const completedBookings = bookings.filter(booking =>
        booking.status === "completed"
      );

      setText("totalBookings", bookings.length);
      setText("todaySessions", todayBookings.length);
      setText("pendingBookings", pendingBookings.length);
      setText("completedBookings", completedBookings.length);

      // TODAY'S SCHEDULE
      scheduleList.replaceChildren();

      if (todayBookings.length === 0) {
        scheduleMessage.textContent = "No sessions scheduled today.";
      } else {
        scheduleMessage.textContent = "";

        todayBookings
          .sort((a, b) =>
            (a.startTime || "").localeCompare(b.startTime || "")
          )
          .forEach(booking => {
            scheduleList.appendChild(createBookingCard(booking));
          });
      }

      // PENDING REQUESTS
      pendingList.replaceChildren();

      if (pendingBookings.length === 0) {
        pendingMessage.textContent = "No pending booking requests.";
      } else {
        pendingMessage.textContent = "";

        pendingBookings.forEach(booking => {
          pendingList.appendChild(createBookingCard(booking));
        });
      }

      // RECENT BOOKINGS
      recentList.replaceChildren();

      const recentBookings = [...bookings]
        .sort((a, b) =>
          new Date(b.createdAt || b.bookingDate) -
          new Date(a.createdAt || a.bookingDate)
        )
        .slice(0, 5);

      if (recentBookings.length === 0) {
        recentMessage.textContent = "No recent bookings.";
      } else {
        recentMessage.textContent = "";

        recentBookings.forEach(booking => {
          recentList.appendChild(createBookingCard(booking));
        });
      }

    } catch (error) {
      console.error("Dashboard error:", error);

      setStatus("databaseStatus", "Unable to load booking data");
      setStatus("bookingSystemStatus", "Connection error");

      scheduleMessage.textContent = "Unable to load schedule.";
      pendingMessage.textContent = "Unable to load pending bookings.";
      recentMessage.textContent = "Unable to load recent bookings.";
    }
  }

  await loadDashboard();
});
