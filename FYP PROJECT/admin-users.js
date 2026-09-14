document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("Admin logged in:", user.email);
            loadUsers();
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

async function loadUsers() {
    const container = document.getElementById("usersList");

    try {
        const db = window.db;
        const collection = window.collection;
        const getDocs = window.getDocs;

        // Get all evaluations to count per user
        const evalSnapshot = await getDocs(collection(db, "evaluations"));

        if (evalSnapshot.empty) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No evaluations found. No users yet.</p>
                </div>
            `;
            return;
        }

        // Group evaluations by userId
        const userMap = {};
        evalSnapshot.forEach((doc) => {
            const data = doc.data();
            const userId = data.userId || "unknown";
            
            if (!userMap[userId]) {
                userMap[userId] = {
                    email: userId,
                    totalEvaluations: 0,
                    totalValue: 0,
                    devices: []
                };
            }
            
            userMap[userId].totalEvaluations++;
            userMap[userId].totalValue += data.estimatedValue || 0;
            if (data.brand && data.model) {
                userMap[userId].devices.push(`${data.brand} ${data.model}`);
            }
        });

        // Convert to array and sort
        const users = Object.values(userMap);
        users.sort((a, b) => b.totalEvaluations - a.totalEvaluations);

        if (users.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No users found.</p>
                </div>
            `;
            return;
        }

        let html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>User Email</th>
                        <th>Evaluations</th>
                        <th>Total Value</th>
                        <th>Avg Value</th>
                        <th>Devices</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach((user, index) => {
            const avgValue = user.totalEvaluations > 0 
                ? Math.round(user.totalValue / user.totalEvaluations) 
                : 0;
            
            // Get unique devices (max 3)
            const uniqueDevices = [...new Set(user.devices)];
            const deviceDisplay = uniqueDevices.slice(0, 3).join(', ');
            const moreDevices = uniqueDevices.length > 3 ? ` +${uniqueDevices.length - 3} more` : '';

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td><strong>${user.email}</strong></td>
                    <td>${user.totalEvaluations}</td>
                    <td>RM ${user.totalValue.toLocaleString()}</td>
                    <td>RM ${avgValue.toLocaleString()}</td>
                    <td style="font-size: 12px; color: #666;">${deviceDisplay}${moreDevices}</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
            <div style="margin-top: 15px; color: #999; font-size: 13px;">
                Total Users: <strong>${users.length}</strong> | Total Evaluations: <strong>${evalSnapshot.size}</strong>
            </div>
        `;

        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading users:", error);
        container.innerHTML = `
            <div class="history-empty">
                <p>❌ Failed to load users: ${error.message}</p>
            </div>
        `;
    }
}