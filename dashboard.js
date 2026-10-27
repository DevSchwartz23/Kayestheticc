document.addEventListener("DOMContentLoaded", function () {
  // Get the logged-in user
  const savedUser = sessionStorage.getItem("user");

  if (!savedUser) {
    window.location.replace("login.html");
    return;
  }

  let user;

  try {
    user = JSON.parse(savedUser);
  } catch (error) {
    window.location.replace("login.html");
    return;
  }

  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  // Display the user's name
  const welcome = document.getElementById("welcomeMessage");

  if (welcome) {
    welcome.textContent = `Welcome, ${firstName || "Client"}!`;
  }

  // Display profile name
  const profileName = document.getElementById("profileName");

  if (profileName) {
    profileName.textContent = fullName || "Client";
  }

  // Display profile initials
  const initials =
    (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || "--";

  document.querySelectorAll(".avatar").forEach((avatar) => {
    avatar.textContent = initials;
  });

  // Display registered email if an email element exists
  const profileEmail = document.getElementById("profileEmail");

  if (profileEmail) {
    profileEmail.textContent = user.email || "";
  }

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
});