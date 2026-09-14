document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            loadAllEvaluations(user.email);
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

    window.viewEvaluation = function(docId) {
        localStorage.setItem("viewEvaluationId", docId);
        window.location.href = "history-detail.html";
    };

    async function loadAllEvaluations(userEmail) {
        const container = document.getElementById("historyList");

        if (!container) {
            console.error("Container not found!");
            return;
        }

        container.innerHTML = `
            <div class="history-empty">
                <p>⏳ Loading your evaluations...</p>
            </div>
        `;

        try {
            const db = window.db;
            const collection = window.collection;
            const query = window.query;
            const where = window.where;
            const getDocs = window.getDocs;

            console.log("Loading all evaluations for user:", userEmail);

            // Removed orderBy to fix the error
            const q = query(
                collection(db, "evaluations"),
                where("userId", "==", userEmail)
            );

            const querySnapshot = await getDocs(q);
            console.log("Query snapshot size:", querySnapshot.size);

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="history-empty">
                        <p>📭 No evaluations yet.</p>
                        <a href="evaluate.html" class="btn-primary">Start Your First Evaluation →</a>
                    </div>
                `;
                return;
            }

            let html = '<div class="history-list">';
            let count = 0;

            // Convert to array and sort by date manually
            const evaluations = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const docId = doc.id;
                evaluations.push({ id: docId, ...data });
            });

            // Sort by createdAt (newest first) — handles both string and timestamp
            evaluations.sort((a, b) => {
                let dateA = a.createdAt;
                let dateB = b.createdAt;

                // Convert string dates to timestamps
                if (typeof dateA === 'string') {
                    const parsed = new Date(dateA);
                    dateA = !isNaN(parsed) ? parsed.getTime() : 0;
                } else if (dateA && dateA.seconds) {
                    dateA = dateA.seconds * 1000;
                } else {
                    dateA = 0;
                }

                if (typeof dateB === 'string') {
                    const parsed = new Date(dateB);
                    dateB = !isNaN(parsed) ? parsed.getTime() : 0;
                } else if (dateB && dateB.seconds) {
                    dateB = dateB.seconds * 1000;
                } else {
                    dateB = 0;
                }

                return dateB - dateA;
            });

            evaluations.forEach((data) => {
                count++;

                let date = "Unknown date";
                if (data.createdAt) {
                    if (typeof data.createdAt === 'object' && data.createdAt.seconds) {
                        date = new Date(data.createdAt.seconds * 1000).toLocaleDateString('en-MY', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        });
                    } else if (typeof data.createdAt === 'string') {
                        try {
                            const parsed = new Date(data.createdAt);
                            if (!isNaN(parsed)) {
                                date = parsed.toLocaleDateString('en-MY', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            } else {
                                date = data.createdAt.split('at')[0].trim();
                            }
                        } catch (e) {
                            date = data.createdAt.split('at')[0].trim();
                        }
                    } else {
                        date = "Unknown date";
                    }
                }

                const deviceLabel = `${data.brand} ${data.model}`;
                const value = `RM ${data.estimatedValue.toLocaleString()}`;

                let depClass = 'low';
                if (data.depreciationRate > 40) depClass = 'high';
                else if (data.depreciationRate > 20) depClass = 'medium';

                html += `
                    <div class="history-item" onclick="viewEvaluation('${data.id}')">
                        <div class="history-item-left">
                            <span class="history-item-icon">📱</span>
                            <div class="history-item-info">
                                <div class="history-item-name">${deviceLabel}</div>
                                <div class="history-item-meta">${data.category} • ${data.condition} • ${date}</div>
                            </div>
                        </div>
                        <div class="history-item-right">
                            <span class="history-item-value">${value}</span>
                            <span class="history-item-depreciation ${depClass}">-${data.depreciationRate}%</span>
                            <span class="history-item-arrow">→</span>
                        </div>
                    </div>
                `;
            });

            html += `
                <div class="history-count">
                    <p>Showing ${count} evaluation${count > 1 ? 's' : ''}</p>
                </div>
            </div>`;

            container.innerHTML = html;
            console.log("All evaluations displayed successfully!");

        } catch (error) {
            console.error("Error loading evaluations:", error);
            container.innerHTML = `
                <div class="history-empty">
                    <p>❌ Failed to load evaluations: ${error.message}</p>
                    <p style="font-size: 12px; color: #999;">Check console for more details (F12)</p>
                </div>
            `;
        }
    }
});