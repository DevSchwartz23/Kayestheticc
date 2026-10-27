
document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("token");

  if (!token) {
    return;
  }

  const message = document.getElementById("bookingsMessage");
  const list = document.getElementById("bookingsList");

  if (!message || !list) {
    console.error("Booking elements not found in dashboard HTML.");
    return;
  }

  // Update dashboard counters
  const setCount = (id, count) => {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = count;
    }
  };

  // Format booking date
  const dateLabel = (value) => {
    if (!value) return "Date not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not set";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    });
  };

  // Format booking time
  const timeLabel = (value) => {
    if (!value) return "Time not set";

    const match = /^(\d{1,2}):(\d{2})$/.exec(value);

    if (!match) return value;

    const hour = Number(match[1]);

    return `${hour % 12 || 12}:${match[2]} ${
      hour < 12 ? "AM" : "PM"
    }`;
  };

  // Create HTML elements safely
  const addText = (parent, tag, value, className = "") => {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    element.textContent = value;
    parent.appendChild(element);

    return element;
  };

  try {
    // Get bookings from MongoDB
    const response = await fetch(
      "http://localhost:5000/api/bookings",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (response.status === 401 || response.status === 403) {
      message.textContent =
        "Your session has expired. Please log in again.";
      return;
    }

    if (!response.ok) {
      throw new Error(
        `Bookings request failed: ${response.status}`
      );
    }

    const bookings = await response.json();

    if (!Array.isArray(bookings)) {
      throw new Error("Unexpected bookings response");
    }

    // Use Philippine local date for upcoming sessions
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila"
    });

    // Update dashboard statistics
    setCount("totalBookings", bookings.length);

    setCount(
      "pendingBookings",
      bookings.filter(
        (booking) => booking.status === "pending"
      ).length
    );

    setCount(
      "completedBookings",
      bookings.filter(
        (booking) => booking.status === "completed"
      ).length
    );

    setCount(
      "upcomingBookings",
      bookings.filter((booking) => {
        const activeStatuses = [
          "pending",
          "confirmed",
          "rescheduled"
        ];

        return (
          activeStatuses.includes(booking.status) &&
          typeof booking.bookingDate === "string" &&
          booking.bookingDate.slice(0, 10) >= today
        );
      }).length
    );

    // Clear previous booking records
    list.replaceChildren();

    if (bookings.length === 0) {
      message.textContent =
        "You have no bookings yet. Book a session to get started.";
      return;
    }

    message.textContent = "";

    // Show newest bookings first
    bookings.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.bookingDate);
      const dateB = new Date(b.createdAt || b.bookingDate);

      return dateB - dateA;
    });

    // Display bookings
    bookings.forEach((booking) => {
      const row = document.createElement("div");

      row.className = "booking";
      row.style.flexWrap = "wrap";

      // Booking date box
      const dateBox = addText(
        row,
        "div",
        "",
        "date-box"
      );

      const date = new Date(booking.bookingDate);

      const validDate = !Number.isNaN(date.getTime());

      addText(
        dateBox,
        "strong",
        validDate
          ? String(date.getUTCDate()).padStart(2, "0")
          : "—"
      );

      addText(
        dateBox,
        "small",
        validDate
          ? date.toLocaleDateString("en-PH", {
              month: "short",
              timeZone: "UTC"
            }).toUpperCase()
          : "—"
      );

      // Booking details
      const details = addText(row, "div", "");

      addText(
        details,
        "h4",
        booking.service?.serviceName || "Photography Session"
      );

      addText(
        details,
        "p",
        `${dateLabel(booking.bookingDate)} · ${timeLabel(
          booking.startTime
        )} · ${booking.location || "Location not set"}`
      );

      // Package price
      if (typeof booking.service?.price === "number") {
        addText(
          details,
          "p",
          `Package price: ₱${booking.service.price.toLocaleString(
            "en-PH"
          )}`
        );
      }

      // Booking status
      const status = String(
        booking.status || "pending"
      ).toLowerCase();

      const statusText =
        status.charAt(0).toUpperCase() + status.slice(1);

      let statusClass = "info";

      if (
        status === "confirmed" ||
        status === "completed"
      ) {
        statusClass = "confirmed";
      } else if (status === "pending") {
        statusClass = "pending";
      }

      addText(
        row,
        "span",
        `● ${statusText}`,
        `status ${statusClass}`
      );

      list.appendChild(row);
    });

  } catch (error) {
    console.error("Unable to load bookings:", error);

    message.textContent =
      "Could not load bookings. Check that your backend is running, then refresh.";
  }
});
