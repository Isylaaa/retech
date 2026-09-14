document.addEventListener("DOMContentLoaded", function() {
    const signupForm = document.getElementById("signupForm");
    const signupMessage = document.getElementById("signupMessage");

    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();
        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (name === "" || email === "" || password === "" || confirmPassword === "") {
            signupMessage.textContent = "Please fill in all fields.";
            signupMessage.style.color = "red";
            return;
        }
        if (name.length < 2) {
            signupMessage.textContent = "Name must be at least 2 characters.";
            signupMessage.style.color = "red";
            return;
        }
        if (password.length < 6) {
            signupMessage.textContent = "Password must contain at least 6 characters.";
            signupMessage.style.color = "red";
            return;
        }
        if (password !== confirmPassword) {
            signupMessage.textContent = "Passwords do not match.";
            signupMessage.style.color = "red";
            return;
        }

        signupMessage.textContent = "Creating account...";
        signupMessage.style.color = "#2865e8";

        const auth = window.auth;
        const createUserWithEmailAndPassword = window.createUserWithEmailAndPassword;
        const updateProfile = window.updateProfile;

        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                return updateProfile(user, { displayName: name });
            })
            .then(() => {
                console.log("Profile updated with name:", name);
                signupMessage.textContent = "Account created successfully! Redirecting...";
                signupMessage.style.color = "green";
                localStorage.setItem("retechUserEmail", email);
                localStorage.setItem("retechUserName", name);
                setTimeout(function() {
                    window.location.href = "dashboard.html";
                }, 1500);
            })
            .catch((error) => {
                const errorCode = error.code;
                let displayMessage = "Sign up failed. Please try again.";
                if (errorCode === "auth/email-already-in-use") {
                    displayMessage = "This email is already registered. Please log in.";
                } else if (errorCode === "auth/invalid-email") {
                    displayMessage = "Invalid email format.";
                } else if (errorCode === "auth/weak-password") {
                    displayMessage = "Password is too weak. Use at least 6 characters.";
                } else if (errorCode === "auth/too-many-requests") {
                    displayMessage = "Too many attempts. Please try again later.";
                }
                signupMessage.textContent = displayMessage;
                signupMessage.style.color = "red";
            });
    });
});