document.addEventListener("DOMContentLoaded", function() {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        if (email === "" || password === "") {
            loginMessage.textContent = "Please fill in all fields.";
            loginMessage.style.color = "red";
            return;
        }
        if (password.length < 6) {
            loginMessage.textContent = "Password must contain at least 6 characters.";
            loginMessage.style.color = "red";
            return;
        }

        loginMessage.textContent = "Logging in...";
        loginMessage.style.color = "#2865e8";

        const auth = window.auth;
        const signInWithEmailAndPassword = window.signInWithEmailAndPassword;

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("User logged in:", user.email);
                loginMessage.textContent = "Login successful! Redirecting...";
                loginMessage.style.color = "green";
                localStorage.setItem("retechUserEmail", user.email);
                
                // --- ADMIN CHECK ---
                // If email matches admin, go to admin dashboard
                if (user.email === "admin@retech.com") {
                    setTimeout(function() {
                        window.location.href = "admin-dashboard.html";
                    }, 1000);
                } else {
                    setTimeout(function() {
                        window.location.href = "dashboard.html";
                    }, 1000);
                }
            })
            .catch((error) => {
                const errorCode = error.code;
                let displayMessage = "Login failed. Please try again.";
                if (errorCode === "auth/user-not-found") {
                    displayMessage = "No account found with this email.";
                } else if (errorCode === "auth/wrong-password") {
                    displayMessage = "Incorrect password. Please try again.";
                } else if (errorCode === "auth/too-many-requests") {
                    displayMessage = "Too many failed attempts. Please try again later.";
                } else if (errorCode === "auth/invalid-email") {
                    displayMessage = "Invalid email format.";
                }
                loginMessage.textContent = displayMessage;
                loginMessage.style.color = "red";
            });
    });
});