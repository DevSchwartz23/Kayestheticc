
document.addEventListener("DOMContentLoaded", async () => {
  const BASE_URL = "http://localhost:5000";
  const token = sessionStorage.getItem("token");

  const calendarGrid = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");
  const pageMonth = document.getElementById("pageMonth");
  const calendarMessage = document.getElementById("calendarMessage");

  const today = new Date();
  let currentYear = today.getFullYear();
  let currentMonth = today.getMonth();
  let bookings = [];

  function logout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.replace("login.html");
  }

  document.getElementById("logoutButton")
    .addEventListener("click", event => {
      event.preventDefault();
      logout();
    });

  if (!token) {
    logout();
    return;
  }

  async function apiRequest(path) {
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        logout();
      }

      throw new Error(data.message || "Unable to load data.");
    }

    return data;
  }

  function dateKey(year, month, day) {
    return [
      year,
      String(month + 1).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");
  }

  function getBookingDate(booking) {
    return String(booking.bookingDate || "").slice(0, 10);
  }

  function formatTime(time) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time || "");

    if (!match) return time || "Time not set";

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

  function renderCalendar() {
    calendarGrid.replaceChildren();

    const monthName = new Date(
      currentYear,
      currentMonth,
      1
    ).toLocaleDateString("en-PH", {
      month: "long",
      year: "numeric"
    });

    calendarTitle.textContent = monthName;
    pageMonth.textContent = monthName;

    // WEEKDAY HEADINGS
    const weekdays = [
      "Mon", "Tue", "Wed", "Thu",
      "Fri", "Sat", "Sun"
    ];

    weekdays.forEach(day => {
      const heading = document.createElement("div");
      heading.className = "cal-head";
      heading.textContent = day;
      calendarGrid.appendChild(heading);
    });

    const firstDay = new Date(currentYear, currentMonth, 1);

    // Monday-first calendar
    const startOffset = (firstDay.getDay() + 6) % 7;

    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

    const totalCells = Math.ceil(
      (startOffset + daysInMonth) / 7
    ) * 7;

    const todayKey = dateKey(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - startOffset + 1;

      const cellDate = new Date(
        currentYear,
        currentMonth,
        dayNumber
      );

      const year = cellDate.getFullYear();
      const month = cellDate.getMonth();
      const day = cellDate.getDate();

      const cellKey = dateKey(year, month, day);

      const isOutsideMonth = month !== currentMonth;

      const cell = document.createElement("div");
      cell.className = "day";

      if (isOutsideMonth) {
        cell.classList.add("muted");
      }

      if (cellKey === todayKey) {
        cell.classList.add("today");
      }

      const number = document.createElement("div");
      number.className = "day-num";
      number.textContent = day;

      cell.appendChild(number);

      const dayBookings = bookings
        .filter(booking => getBookingDate(booking) === cellKey)
        .sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || "")
        );

      dayBookings.forEach(booking => {
        const event = document.createElement("div");

        const status = String(
          booking.status || "pending"
        ).toLowerCase();

        const allowedStatuses = [
          "pending",
          "confirmed",
          "completed",
          "cancelled",
          "rescheduled"
        ];

        const statusClass = allowedStatuses.includes(status)
          ? status
          : "pending";

        event.className = `event ${statusClass}`;

        const clientName = getClientName(booking);
        const serviceName = getServiceName(booking);

        event.textContent =
          `${formatTime(booking.startTime)} · ` +
          `${clientName} · ${serviceName}`;

        event.title =
          `Customer: ${clientName}\n` +
          `Service: ${serviceName}\n` +
          `Time: ${formatTime(booking.startTime)}\n` +
          `Location: ${booking.location || "Not set"}\n` +
          `Status: ${status}`;

        cell.appendChild(event);
      });

      calendarGrid.appendChild(cell);
    }
  }

  // CALENDAR NAVIGATION
  document.getElementById("prevMonth")
    .addEventListener("click", () => {
      currentMonth--;

      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }

      renderCalendar();
    });

  document.getElementById("nextMonth")
    .addEventListener("click", () => {
      currentMonth++;

      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }

      renderCalendar();
    });

  document.getElementById("todayButton")
    .addEventListener("click", () => {
      const now = new Date();

      currentMonth = now.getMonth();
      currentYear = now.getFullYear();

      renderCalendar();
    });

  // SHOW CALENDAR IMMEDIATELY
  renderCalendar();

  // VERIFY ADMIN ACCOUNT
  try {
    const authData = await apiRequest("/api/auth/me");
    const admin = authData.user || authData;

    if (admin.role !== "admin") {
      alert("Admin access only.");
      window.location.replace("user-dashboard.html");
      return;
    }

    const fullName =
      `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
      || "Admin";

    document.getElementById("adminName").textContent = fullName;

    const initials =
      `${(admin.firstName || "A")[0]}` +
      `${(admin.lastName || "D")[0]}`;

    document.querySelectorAll(".avatar").forEach(avatar => {
      avatar.textContent = initials.toUpperCase();
    });

  } catch (error) {
    console.error("Admin authentication error:", error);
    calendarMessage.textContent = "Unable to verify admin account.";
    return;
  }

  // LOAD REAL BOOKINGS FROM MONGODB
  try {
    const result = await apiRequest("/api/bookings");

    if (!Array.isArray(result)) {
      throw new Error("Invalid booking data received.");
    }

    bookings = result;

    renderCalendar();

    if (bookings.length === 0) {
      calendarMessage.textContent = "No customer bookings yet.";
    } else {
      calendarMessage.textContent =
        `${bookings.length} total booking(s) loaded.`;
    }

  } catch (error) {
    console.error("Calendar error:", error);
    calendarMessage.textContent =
      `Unable to load bookings: ${error.message}`;
  }
});
