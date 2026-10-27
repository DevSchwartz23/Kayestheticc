document.getElementById("signupForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const consent = document.getElementById("consent").checked;

  // Check if passwords match
  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  if (!consent) {
    alert("Please agree to the terms and conditions.");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        firstName,
        lastName,
        email,
        phone,
        password,
        consent
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert("Account created successfully! Please log in.");

      // Redirect to login page
      window.location.href = "login.html";
    } else {
      alert(data.message || "Signup failed. Please try again.");
    }

  } catch (error) {
    console.error("Signup error:", error);
    alert("Cannot connect to server. Make sure your backend is running.");
  }
});