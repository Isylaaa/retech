document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            loadProfileData(user);
        } else {
            console.log("No user logged in. Redirecting to login...");
            window.location.href = "index.html";
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            signOut(auth)
                .then(() => {
                    window.location.href = "index.html";
                })
                .catch(() => {
                    alert("Failed to logout. Please try again.");
                });
        });
    }
});

// ============================================================
// GLOBALS
// ============================================================

let currentUser = null;
let userEmail = "";
let allEvaluations = [];

// ============================================================
// LOAD PROFILE DATA
// ============================================================

async function loadProfileData(user) {
    currentUser = user;
    userEmail = user.email;

    // Display user info
    document.getElementById("profileName").textContent = user.displayName || user.email;
    document.getElementById("profileEmail").textContent = user.email;

    // Try to get join date from Firebase Auth (user.metadata.creationTime)
    if (user.metadata && user.metadata.creationTime) {
        const joinDate = new Date(user.metadata.creationTime);
        document.getElementById("profileJoinDate").textContent = `Member since: ${joinDate.toLocaleDateString('en-MY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
    } else {
        document.getElementById("profileJoinDate").textContent = "Member since: Unknown";
    }

    // Set edit name field
    document.getElementById("editName").value = user.displayName || "";

    // Load evaluations
    await loadUserEvaluations(user.email);
}

// ============================================================
// LOAD USER EVALUATIONS
// ============================================================

async function loadUserEvaluations(email) {
    try {
        const db = window.db;
        const collection = window.collection;
        const query = window.query;
        const where = window.where;
        const getDocs = window.getDocs;

        const q = query(
            collection(db, "evaluations"),
            where("userId", "==", email)
        );

        const querySnapshot = await getDocs(q);
        console.log("Evaluations found:", querySnapshot.size);

        if (querySnapshot.empty) {
            document.getElementById("statTotalEvals").textContent = "0";
            document.getElementById("statTotalDevices").textContent = "0";
            document.getElementById("statAvgValue").textContent = "RM 0";
            document.getElementById("profileRecentList").innerHTML = `
                <div class="history-empty">
                    <p>📭 No evaluations yet.</p>
                </div>
            `;
            return;
        }

        // Collect all evaluations
        allEvaluations = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allEvaluations.push({ id: doc.id, ...data });
        });

        // Sort by createdAt (newest first)
        allEvaluations.sort((a, b) => {
            let dateA = a.createdAt;
            let dateB = b.createdAt;

            if (dateA && typeof dateA === 'object' && dateA.seconds) dateA = dateA.seconds * 1000;
            else if (typeof dateA === 'string') {
                const parsed = new Date(dateA);
                dateA = !isNaN(parsed) ? parsed.getTime() : 0;
            } else dateA = 0;

            if (dateB && typeof dateB === 'object' && dateB.seconds) dateB = dateB.seconds * 1000;
            else if (typeof dateB === 'string') {
                const parsed = new Date(dateB);
                dateB = !isNaN(parsed) ? parsed.getTime() : 0;
            } else dateB = 0;

            return dateB - dateA;
        });

        // Update stats
        const totalEvals = allEvaluations.length;
        const totalValue = allEvaluations.reduce((sum, ev) => sum + ev.estimatedValue, 0);
        const avgValue = totalValue / totalEvals;

        document.getElementById("statTotalEvals").textContent = totalEvals;
        document.getElementById("statTotalDevices").textContent = totalEvals;
        document.getElementById("statAvgValue").textContent = `RM ${Math.round(avgValue).toLocaleString()}`;

        // Display recent evaluations (5 most recent)
        const recentEvals = allEvaluations.slice(0, 5);
        const container = document.getElementById("profileRecentList");

        let html = '<div class="recent-list">';
        recentEvals.forEach((data) => {
            let date = "Unknown date";
            if (data.createdAt) {
                if (typeof data.createdAt === 'object' && data.createdAt.seconds) {
                    date = new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-MY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (typeof data.createdAt === 'string') {
                    const match = data.createdAt.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
                    if (match) {
                        date = `${match[1]} ${match[2]} ${match[3]}`;
                    } else {
                        date = data.createdAt.split('at')[0].trim();
                    }
                }
            }

            const deviceLabel = `${data.brand} ${data.model}`;
            const value = `RM ${data.estimatedValue.toLocaleString()}`;

            let depClass = 'low';
            if (data.depreciationRate > 40) depClass = 'high';
            else if (data.depreciationRate > 20) depClass = 'medium';

            html += `
                <div class="recent-item" onclick="viewEvaluation('${data.id}')">
                    <div class="recent-item-left">
                        <span class="recent-item-icon">📱</span>
                        <div class="recent-item-info">
                            <div class="recent-item-name">${deviceLabel}</div>
                            <div class="recent-item-meta">${data.category} • ${data.condition} • ${date}</div>
                        </div>
                    </div>
                    <div class="recent-item-right">
                        <span class="recent-item-value">${value}</span>
                        <span class="recent-item-depreciation ${depClass}">-${data.depreciationRate}%</span>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading evaluations:", error);
    }
}

// ============================================================
// VIEW EVALUATION DETAIL
// ============================================================

window.viewEvaluation = function(docId) {
    localStorage.setItem("viewEvaluationId", docId);
    window.location.href = "history-detail.html";
};

// ============================================================
// TOGGLE EDIT FORM
// ============================================================

window.toggleEdit = function() {
    const form = document.getElementById("editForm");
    if (form.style.display === "none") {
        form.style.display = "block";
        document.getElementById("editName").value = currentUser.displayName || "";
    } else {
        form.style.display = "none";
    }
};

// ============================================================
// SAVE PROFILE
// ============================================================

window.saveProfile = async function() {
    const newName = document.getElementById("editName").value.trim();

    if (!newName) {
        alert("Please enter a name.");
        return;
    }

    try {
        const auth = window.auth;
        const updateProfile = window.updateProfile;
        const user = auth.currentUser;

        await updateProfile(user, {
            displayName: newName
        });

        // Update UI
        document.getElementById("profileName").textContent = newName;
        document.getElementById("editName").value = newName;

        // Hide edit form
        document.getElementById("editForm").style.display = "none";

        alert("✅ Profile updated successfully!");

    } catch (error) {
        console.error("Error updating profile:", error);
        alert("❌ Failed to update profile. Please try again.");
    }
};