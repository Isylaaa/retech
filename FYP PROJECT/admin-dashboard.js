document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("Admin logged in:", user.email);
            document.getElementById("adminName").textContent = user.displayName || user.email;
            loadAdminStats();
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

    async function loadAdminStats() {
        try {
            const db = window.db;
            const collection = window.collection;
            const getDocs = window.getDocs;

            // Count evaluations
            const evalSnapshot = await getDocs(collection(db, "evaluations"));
            document.getElementById("statEvals").textContent = evalSnapshot.size;

            // Count device models
            const deviceSnapshot = await getDocs(collection(db, "deviceModels"));
            document.getElementById("statDevices").textContent = deviceSnapshot.size;

            // Count unique brands
            const brands = new Set();
            deviceSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.brand) {
                    brands.add(data.brand);
                }
            });
            document.getElementById("statBrands").textContent = brands.size;

            // Count users (approximate from evaluations)
            const users = new Set();
            evalSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.userId) {
                    users.add(data.userId);
                }
            });
            document.getElementById("statUsers").textContent = users.size;

            // Load recent evaluations
            loadRecentEvals(evalSnapshot);

        } catch (error) {
            console.error("Error loading stats:", error);
        }
    }

    function loadRecentEvals(evalSnapshot) {
        const container = document.getElementById("adminRecentList");

        if (evalSnapshot.empty) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No evaluations yet.</p>
                </div>
            `;
            return;
        }

        // Get last 5 evaluations
        const evals = [];
        evalSnapshot.forEach((doc) => {
            const data = doc.data();
            evals.push({ id: doc.id, ...data });
        });

        evals.sort((a, b) => {
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

        const recent = evals.slice(0, 5);

        let html = '<div class="recent-list">';
        recent.forEach((data) => {
            let date = "Unknown date";
            if (data.createdAt) {
                if (typeof data.createdAt === 'object' && data.createdAt.seconds) {
                    date = new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-MY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                } else if (typeof data.createdAt === 'string') {
                    date = data.createdAt.split('at')[0].trim();
                }
            }

            const deviceLabel = `${data.brand} ${data.model}`;
            const value = `RM ${data.estimatedValue.toLocaleString()}`;
            const user = data.userId || "Unknown";

            let depClass = 'low';
            if (data.depreciationRate > 40) depClass = 'high';
            else if (data.depreciationRate > 20) depClass = 'medium';

            html += `
                <div class="recent-item">
                    <div class="recent-item-left">
                        <span class="recent-item-icon">📱</span>
                        <div class="recent-item-info">
                            <div class="recent-item-name">${deviceLabel}</div>
                            <div class="recent-item-meta">${data.category} • ${data.condition} • ${date}</div>
                            <div class="recent-item-user">👤 ${user}</div>
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
    }
});