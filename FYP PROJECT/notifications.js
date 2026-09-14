document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            loadNotifications(user.email);
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

async function loadNotifications(userEmail) {
    const container = document.getElementById("notificationsList");

    try {
        const db = window.db;
        const collection = window.collection;
        const query = window.query;
        const where = window.where;
        const getDocs = window.getDocs;

        // Get all notifications for this user
        const q = query(
            collection(db, "notifications"),
            where("userId", "==", userEmail)
        );

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No notifications yet</p>
                </div>
            `;
            return;
        }

        let html = '<div class="notifications-list">';
        const notifications = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({ id: doc.id, ...data });
        });

        // Sort by newest first
        notifications.sort((a, b) => {
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

        notifications.forEach((notification) => {
            let date = "Unknown";
            if (notification.createdAt) {
                if (typeof notification.createdAt === 'object' && notification.createdAt.seconds) {
                    date = new Date(notification.createdAt.seconds * 1000).toLocaleDateString('en-MY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else if (typeof notification.createdAt === 'string') {
                    date = notification.createdAt.split('at')[0].trim();
                }
            }

            const isRead = notification.read || false;

            // --- SAFE HANDLING: check if value fields exist ---
            let oldValue = notification.oldValue || 0;
            let newValue = notification.newValue || 0;
            let change = notification.change || 0;

            const isPositive = change > 0;
            const changeColor = isPositive ? '#28a745' : '#dc3545';
            const changeIcon = isPositive ? '📈' : '📉';

            // Only show value details if they exist
            let valueDetails = '';
            if (oldValue > 0 && newValue > 0) {
                valueDetails = `
                    <div class="notification-details">
                        <span class="notification-old">Old: <strong>RM ${oldValue.toLocaleString()}</strong></span>
                        <span class="notification-new">New: <strong>RM ${newValue.toLocaleString()}</strong></span>
                        <span class="notification-change" style="color: ${changeColor};">
                            ${isPositive ? '+' : ''}${change.toFixed(1)}%
                        </span>
                    </div>
                `;
            } else {
                valueDetails = `
                    <div class="notification-details">
                        <span class="notification-change" style="color: #2865e8;">
                            ${notification.changeMessage || 'Rate update applied'}
                        </span>
                    </div>
                `;
            }

            html += `
                <div class="notification-item ${isRead ? 'read' : 'unread'}" onclick="markAsRead('${notification.id}')">
                    <div class="notification-icon">${changeIcon}</div>
                    <div class="notification-content">
                        <div class="notification-title">${notification.title || '📢 Update'}</div>
                        <div class="notification-message">${notification.message || 'Your device value has been updated.'}</div>
                        ${valueDetails}
                        <div class="notification-meta">${date} ${isRead ? '• ✅ Read' : '• 🔵 New'}</div>
                    </div>
                    <div class="notification-arrow">→</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading notifications:", error);
        container.innerHTML = `
            <div class="history-empty">
                <p>❌ Failed to load notifications: ${error.message}</p>
            </div>
        `;
    }
}

async function markAsRead(notificationId) {
    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;

        const docRef = doc(db, "notifications", notificationId);
        await updateDoc(docRef, {
            read: true
        });

        console.log("Notification marked as read");
        
        // Reload notifications
        const auth = window.auth;
        const user = auth.currentUser;
        if (user) {
            loadNotifications(user.email);
        }

    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}