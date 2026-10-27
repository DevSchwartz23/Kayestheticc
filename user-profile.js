document.addEventListener("DOMContentLoaded", function () {
  const savedUser = sessionStorage.getItem("user");

  if (!savedUser) return;

  try {
    const user = JSON.parse(savedUser);

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";

    const fullName = `${firstName} ${lastName}`.trim();

    const initials =
      `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

    document.querySelectorAll(".loggedInName").forEach((element) => {
      element.textContent = fullName || "Client";
    });

    document.querySelectorAll(".avatar").forEach((element) => {
      element.textContent = initials || "--";
    });
  } catch (error) {
    console.error("Unable to load profile:", error);
  }
});