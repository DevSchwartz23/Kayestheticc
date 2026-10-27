
document.addEventListener("DOMContentLoaded", async function () {
  const API_URL = "http://localhost:5000/api";

  const token = sessionStorage.getItem("token");

  if (!token) {
    window.location.replace("login.html");
    return;
  }

  let selectedService = null;
  let services = [];

  // Load photography packages from MongoDB
  try {
    const response = await fetch(`${API_URL}/services`);

    if (!response.ok) {
      throw new Error("Failed to load services");
    }

    services = await response.json();

    console.log("Available photography services:", services);
  } catch (error) {
    console.error(error);
    alert("Unable to load photography packages.");
    return;
  }

  // Package selection buttons
  const portraitButton = document.getElementById("selectPortrait");
  const eventButton = document.getElementById("selectEvent");

  function selectService(serviceName) {
    selectedService = services.find(
      (service) =>
        service.serviceName === serviceName &&
        service.availability === true
    );

    if (!selectedService) {
      alert("This photography package is unavailable.");
      return;
    }

    document.getElementById("reviewService").textContent =
      selectedService.serviceName;

    document.getElementById("reviewPrice").textContent =
      `₱${selectedService.price.toLocaleString()}`;

    portraitButton.className =
      serviceName === "Portrait Session" ? "gold-btn" : "outline-btn";

    eventButton.className =
      serviceName === "Event Photography" ? "gold-btn" : "outline-btn";
  }

  portraitButton.addEventListener("click", function () {
    selectService("Portrait Session");
  });

  eventButton.addEventListener("click", function () {
    selectService("Event Photography");
  });

  // Select portrait package by default
  selectService("Portrait Session");

  // Confirm booking
  document.getElementById("confirmBooking")
    .addEventListener("click", async function () {
      const bookingDate = document.getElementById("bookingDate").value;
      const startTime = document.getElementById("bookingTime").value;
      const location = document.getElementById("bookingLocation").value.trim();
      const theme = document.getElementById("bookingTheme").value.trim();
      const requests = document.getElementById("bookingRequests").value.trim();

      if (!selectedService || !bookingDate || !startTime || !location) {
        alert("Please complete your booking details.");
        return;
      }

      if (bookingDate < new Date().toLocaleDateString("en-CA")) {
        alert("Please select today or a future date.");
        return;
      }

      const notes = [
        theme ? `Theme: ${theme}` : "",
        requests ? `Special requests: ${requests}` : ""
      ].filter(Boolean).join("\n");

      const confirmButton = document.getElementById("confirmBooking");
      confirmButton.disabled = true;

      try {
        const response = await fetch(`${API_URL}/bookings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            service: selectedService._id,
            bookingDate,
            startTime,
            location,
            notes
          })
        });

        const data = await response.json();

        if (!response.ok) {
          alert(data.message || "Booking failed.");
          return;
        }

        alert("Booking submitted successfully! Status: Pending.");

        window.location.href = "user-dashboard.html";
      } catch (error) {
        console.error("Booking error:", error);
        alert("Unable to connect to the booking server.");
      } finally {
        confirmButton.disabled = false;
      }
    });
});
