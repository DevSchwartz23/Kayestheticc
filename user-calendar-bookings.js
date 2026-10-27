
document.addEventListener("DOMContentLoaded", async function () {
  const calendarGrid = document.getElementById("calendarGrid");
  const calendarTitle = document.getElementById("calendarTitle");
  const monthHeading = document.getElementById("monthHeading");
  const calendarMessage = document.getElementById("calendarMessage");

  const token = sessionStorage.getItem("token");

  let currentDate = new Date();
  let bookings = [];

  const dayNames = [
    "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
  ];

  // Format time
  function formatTime(time) {
    if (!time) return "Time not set";

    const match = /^(\d{1,2}):(\d{2})$/.exec(time);

    if (!match) return time;

    const hour = Number(match[1]);

    return `${hour % 12 || 12}:${match[2]} ${
      hour < 12 ? "AM" : "PM"
    }`;
  }

  // Get booking date without timezone changes
  function getBookingDate(value) {
    if (!value) return "";

    return String(value).slice(0, 10);
  }

  // Render calendar
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthName = currentDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric"
    });

    calendarTitle.textContent = monthName;
    monthHeading.textContent = monthName;

    calendarGrid.replaceChildren();

    // Weekday headings
    dayNames.forEach(function (day) {
      const heading = document.createElement("div");
      heading.className = "cal-head";
      heading.textContent = day;
      calendarGrid.appendChild(heading);
    });

    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const totalCells =
      Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dateNumber = i - startOffset + 1;

      const cellDate = new Date(year, month, dateNumber);

      const dayCell = document.createElement("div");
      dayCell.className = "day";

      const dayNumber = document.createElement("div");
      dayNumber.className = "day-num";
      dayNumber.textContent = cellDate.getDate();

      // Dates outside the current month
      if (
        cellDate.getMonth() !== month ||
        cellDate.getFullYear() !== year
      ) {
        dayCell.classList.add("muted");
      }

      // Highlight today
      const today = new Date();

      if (
        cellDate.getDate() === today.getDate() &&
        cellDate.getMonth() === today.getMonth() &&
        cellDate.getFullYear() === today.getFullYear()
      ) {
        dayNumber.style.fontWeight = "700";
        dayNumber.style.textDecoration = "underline";
      }

      dayCell.appendChild(dayNumber);

      // Match bookings with this date
      const dateKey =
        `${cellDate.getFullYear()}-` +
        `${String(cellDate.getMonth() + 1).padStart(2, "0")}-` +
        `${String(cellDate.getDate()).padStart(2, "0")}`;

      const dayBookings = bookings.filter(function (booking) {
        return getBookingDate(booking.bookingDate) === dateKey;
      });

      // Display bookings
      dayBookings.forEach(function (booking) {
        const event = document.createElement("div");

        const status = String(
          booking.status || "pending"
        ).toLowerCase();

        event.className = "calendar-booking";
        event.style.fontSize = "11px";
        event.style.padding = "5px";
        event.style.marginTop = "5px";
        event.style.borderRadius = "5px";
        event.style.cursor = "default";
        event.style.overflowWrap = "anywhere";

        if (status === "confirmed") {
          event.style.backgroundColor = "#dcfce7";
          event.style.color = "#166534";
        } else if (status === "pending") {
          event.style.backgroundColor = "#fef3c7";
          event.style.color = "#92400e";
        } else {
          event.style.backgroundColor = "#e5e7eb";
          event.style.color = "#374151";
        }

        const serviceName =
          booking.service?.serviceName || "Photography Session";

        const eventTitle = document.createElement("strong");
        eventTitle.textContent = serviceName;

        const eventDetails = document.createElement("div");
        eventDetails.textContent =
          `${formatTime(booking.startTime)} · ${status}`;

        event.appendChild(eventTitle);
        event.appendChild(eventDetails);

        // Show location on hover
        event.title =
          `${serviceName}\n` +
          `Time: ${formatTime(booking.startTime)}\n` +
          `Location: ${booking.location || "Not set"}\n` +
          `Status: ${status}`;

        dayCell.appendChild(event);
      });

      calendarGrid.appendChild(dayCell);
    }
  }

  // Previous month
  document.getElementById("prevMonth")
    .addEventListener("click", function () {
      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() - 1,
        1
      );

      renderCalendar();
    });

  // Next month
  document.getElementById("nextMonth")
    .addEventListener("click", function () {
      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1
      );

      renderCalendar();
    });

  // Today
  document.getElementById("todayButton")
    .addEventListener("click", function () {
      currentDate = new Date();
      renderCalendar();
    });

  // Logout
  const logoutButton = document.getElementById("logoutButton");

  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();

      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");

      window.location.replace("login.html");
    });
  }

  // Display calendar immediately
  renderCalendar();

  // Load real bookings from MongoDB
  if (!token) {
    if (calendarMessage) {
      calendarMessage.textContent = "Please log in to view your bookings.";
    }
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/bookings",
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to load bookings: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid bookings response");
    }

    bookings = data;

    renderCalendar();

    if (calendarMessage) {
      calendarMessage.textContent = bookings.length
        ? "Your photography bookings are displayed on the calendar."
        : "You have no bookings yet.";
    }

  } catch (error) {
    console.error("Calendar booking error:", error);

    if (calendarMessage) {
      calendarMessage.textContent =
        "Unable to load bookings. Check your backend connection.";
    }
  }
});
