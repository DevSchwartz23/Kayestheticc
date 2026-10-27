document.addEventListener("DOMContentLoaded", function () {
  const savedUser = sessionStorage.getItem("user");

  if (!savedUser) {
    return;
  }

  try {
    const user = JSON.parse(savedUser);

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    const fullName = `${firstName} ${lastName}`.trim();

    // Display welcome message
    const welcome = document.getElementById("welcomeMessage");

    if (welcome) {
      welcome.textContent = `Welcome, ${firstName || "Client"}!`;
    }

    // Display account name
    const profileName = document.getElementById("profileName");

    if (profileName) {
      profileName.textContent = fullName || "Client";
    }

    // Display initials
    const initials = (
      firstName.charAt(0) + lastName.charAt(0)
    ).toUpperCase() || "--";

    document.querySelectorAll(".avatar").forEach((avatar) => {
      avatar.textContent = initials;
    });

  } catch (error) {
    console.error("Unable to load user information:", error);
  }
});