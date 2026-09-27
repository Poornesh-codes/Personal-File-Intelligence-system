const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(
            "https://filemind-backend-vvxh.onrender.com/api/auth/login",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.message;
            return;
        }

        // Store JWT
        localStorage.setItem("token", data.token);

        // Store user information
        localStorage.setItem(
            "user",
            JSON.stringify(data.user)
        );

        message.textContent = "Login successful!";

        // Redirect to dashboard
        setTimeout(() => {
            window.location.href = "index.html";
        }, 500);

    } catch (error) {

        console.error(error);

        message.textContent =
            "Unable to connect to server";
    }
});