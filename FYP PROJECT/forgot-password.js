document.addEventListener("DOMContentLoaded", function() {

    const resetForm = document.getElementById("forgotPasswordForm");
    const resetMessage = document.getElementById("resetMessage");

    resetForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();

        // --- Validation ---
        if (email === "") {
            resetMessage.textContent = "Please enter your email address.";
            resetMessage.style.color = "red";
            return;
        }

        // Simple email format check
        if (!email.includes("@") || !email.includes(".")) {
            resetMessage.textContent = "Please enter a valid email address.";
            resetMessage.style.color = "red";
            return;
        }

        // --- Show loading state ---
        resetMessage.textContent = "Sending reset link...";
        resetMessage.style.color = "#2865e8";

        // --- Firebase Send Password Reset Email ---
        const auth = window.auth;
        const sendPasswordResetEmail = window.sendPasswordResetEmail;

        sendPasswordResetEmail(auth, email)
            .then(() => {
                // Email sent successfully
                console.log("Password reset email sent to:", email);

                resetMessage.textContent = "✅ Reset link sent! Check your email inbox.";
                resetMessage.style.color = "green";

                // Clear the email field
                document.getElementById("email").value = "";

                // Optional: Disable button briefly to prevent spam
                const submitButton = resetForm.querySelector(".login-button");
                submitButton.disabled = true;
                submitButton.style.opacity = "0.6";
                submitButton.textContent = "SENT ✓";

                setTimeout(function() {
                    submitButton.disabled = false;
                    submitButton.style.opacity = "1";
                    submitButton.textContent = "SEND RESET LINK";
                }, 5000);

            })
            .catch((error) => {
                // Email sending failed
                const errorCode = error.code;

                console.error("Password reset error:", errorCode);

                let displayMessage = "Failed to send reset link. Please try again.";

                if (errorCode === "auth/user-not-found") {
                    displayMessage = "No account found with this email address.";
                } else if (errorCode === "auth/invalid-email") {
                    displayMessage = "Invalid email format.";
                } else if (errorCode === "auth/too-many-requests") {
                    displayMessage = "Too many requests. Please try again later.";
                }

                resetMessage.textContent = displayMessage;
                resetMessage.style.color = "red";
            });
    });

});