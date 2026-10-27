(async function checkDashboardAccess() {
  const token = sessionStorage.getItem("token");

  // No token = redirect to login
  if (!token) {
    window.location.replace("login.html");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Session invalid");
    }

    const data = await response.json();

    // Check whether the user is a client
    if (data.user.role !== "client") {
      window.location.replace("login.html");
      return;
    }

    console.log("Dashboard access verified");

  } catch (error) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    alert("Please log in to access your dashboard.");
    window.location.replace("login.html");
  }
})();