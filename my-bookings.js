
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:5000/api/bookings";
  const token = sessionStorage.getItem("token");

  const list = document.getElementById("bookingsList");
  const message = document.getElementById("bookingsMessage");
  const dialog = document.getElementById("rescheduleDialog");
  const form = document.getElementById("rescheduleForm");

  let selectedBookingId = null;

  function setCount(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function formatDate(value) {
    if (!value) return "Date not set";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not set";
    }

    return date.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
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

  function addText(parent, tag, value, className = "") {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  function localToday() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());

    const get = (type) =>
      parts.find(part => part.type === type)?.value;

    return `${get("year")}-${get("month")}-${get("day")}`;
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  async function loadBookings() {
    message.textContent = "Loading your bookings...";
    list.replaceChildren();

    try {
      const bookings = await request(API);

      if (!Array.isArray(bookings)) {
        throw new Error("Invalid bookings response");
      }

      setCount("totalBookings", bookings.length);
      setCount("pendingBookings",
        bookings.filter(b => b.status === "pending").length);
      setCount("confirmedBookings",
        bookings.filter(b => b.status === "confirmed").length);
      setCount("completedBookings",
        bookings.filter(b => b.status === "completed").length);

      if (bookings.length === 0) {
        message.textContent =
          "You have no bookings yet. Book a session to get started.";
        return;
      }

      message.textContent = "";

      bookings.sort((a, b) =>
        new Date(b.createdAt || b.bookingDate) -
        new Date(a.createdAt || a.bookingDate)
      );

      bookings.forEach(booking => {
        const card = document.createElement("div");
        card.className = "card panel";
        card.style.marginBottom = "14px";
        card.style.boxShadow = "none";

        const heading = addText(
          card,
          "h3",
          booking.service?.serviceName || "Photography Session"
        );

        heading.style.marginBottom = "10px";

        addText(
          card,
          "p",
          `Date: ${formatDate(booking.bookingDate)}`
        );

        addText(
          card,
          "p",
          `Time: ${formatTime(booking.startTime)}`
        );

        addText(
          card,
          "p",
          `Location: ${booking.location || "Not set"}`
        );

        if (typeof booking.service?.price === "number") {
          addText(
            card,
            "p",
            `Price: ₱${booking.service.price.toLocaleString("en-PH")}`
          );
        }

        const status = String(
          booking.status || "pending"
        ).toLowerCase();

        const badge = addText(
          card,
          "span",
          `● ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          `status ${
            status === "confirmed" || status === "completed"
              ? "confirmed"
              : status === "pending"
                ? "pending"
                : "info"
          }`
        );

        badge.style.display = "inline-block";
        badge.style.marginTop = "10px";

        if (status === "pending") {
          const actions = document.createElement("div");
          actions.style.display = "flex";
          actions.style.flexWrap = "wrap";
          actions.style.gap = "10px";
          actions.style.marginTop = "16px";

          const rescheduleButton = addText(
            actions,
            "button",
            "Reschedule",
            "outline-btn"
          );

          rescheduleButton.type = "button";

          rescheduleButton.addEventListener("click", () => {
            selectedBookingId = booking._id;

            document.getElementById("newBookingDate").value =
              String(booking.bookingDate).slice(0, 10);

            document.getElementById("newBookingDate").min =
              localToday();

            document.getElementById("newBookingTime").value =
              booking.startTime;

            dialog.showModal();
          });

          const cancelButton = addText(
            actions,
            "button",
            "Cancel Booking",
            "outline-btn"
          );

          cancelButton.type = "button";

          cancelButton.addEventListener("click", async () => {
            const confirmed = confirm(
              "Are you sure you want to cancel this booking?"
            );

            if (!confirmed) return;

            cancelButton.disabled = true;

            try {
              await request(
                `${API}/${booking._id}/cancel`,
                { method: "PATCH" }
              );

              alert("Booking cancelled successfully.");
              await loadBookings();
            } catch (error) {
              alert(error.message);
              cancelButton.disabled = false;
            }
          });

          card.appendChild(actions);
        }

        list.appendChild(card);
      });

    } catch (error) {
      console.error("Bookings error:", error);
      message.textContent = error.message;
    }
  }

  document.getElementById("closeDialog")
    .addEventListener("click", () => {
      dialog.close();
    });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (!selectedBookingId) return;

    const bookingDate =
      document.getElementById("newBookingDate").value;

    const startTime =
      document.getElementById("newBookingTime").value;

    if (!bookingDate || !startTime) {
      alert("Please select a date and time.");
      return;
    }

    if (bookingDate < localToday()) {
      alert("Please choose today or a future date.");
      return;
    }

    const saveButton = document.getElementById("saveReschedule");
    saveButton.disabled = true;

    try {
      await request(`${API}/${selectedBookingId}`, {
        method: "PUT",
        body: JSON.stringify({
          bookingDate,
          startTime
        })
      });

      dialog.close();
      selectedBookingId = null;

      alert("Booking schedule updated successfully.");
      await loadBookings();

    } catch (error) {
      alert(error.message);
    } finally {
      saveButton.disabled = false;
    }
  });

  const logout = document.getElementById("logoutButton");

  logout.addEventListener("click", event => {
    event.preventDefault();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.location.replace("login.html");
  });

  if (token) {
    loadBookings();
  }
});
