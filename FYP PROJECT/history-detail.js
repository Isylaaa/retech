document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            loadEvaluationDetail();
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

    async function loadEvaluationDetail() {
        const container = document.getElementById("detailContent");
        const docId = localStorage.getItem("viewEvaluationId");

        if (!docId) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>❌ No evaluation selected.</p>
                    <a href="history.html" class="btn-primary">Go to History</a>
                </div>
            `;
            return;
        }

        try {
            const db = window.db;
            const doc = window.doc;
            const getDoc = window.getDoc;

            const docRef = doc(db, "evaluations", docId);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                container.innerHTML = `
                    <div class="history-empty">
                        <p>❌ Evaluation not found.</p>
                        <a href="history.html" class="btn-primary">Go to History</a>
                    </div>
                `;
                return;
            }

            const data = docSnap.data();

            let date = "Unknown date";
            if (data.createdAt) {
                const timestamp = data.createdAt.seconds || data.createdAt;
                date = new Date(timestamp * 1000).toLocaleDateString('en-MY', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            let depClass = 'low';
            if (data.depreciationRate > 40) depClass = 'high';
            else if (data.depreciationRate > 20) depClass = 'medium';

            let html = `
                <div class="detail-card">
                    <div class="detail-header">
                        <h2>📊 Evaluation Details</h2>
                        <p class="detail-date">${date}</p>
                    </div>

                    <div class="detail-main">
                        <div class="detail-value">
                            <span class="detail-label">Estimated Resale Value</span>
                            <span class="detail-amount">RM ${data.estimatedValue.toLocaleString()}</span>
                        </div>

                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-item-label">Device</span>
                                <span class="detail-item-value">${data.brand} ${data.model}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Category</span>
                                <span class="detail-item-value">${data.category}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Condition</span>
                                <span class="detail-item-value">${data.condition}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Depreciation</span>
                                <span class="detail-item-value depreciation-badge ${depClass}">-${data.depreciationRate}%</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Original Price</span>
                                <span class="detail-item-value">RM ${data.originalPrice.toLocaleString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Device Age</span>
                                <span class="detail-item-value">${data.deviceAge} years</span>
                            </div>
                            ${data.storage ? `
                            <div class="detail-item">
                                <span class="detail-item-label">Storage</span>
                                <span class="detail-item-value">${data.storage}</span>
                            </div>` : ''}
                            ${data.ram ? `
                            <div class="detail-item">
                                <span class="detail-item-label">RAM</span>
                                <span class="detail-item-value">${data.ram}</span>
                            </div>` : ''}
                            <div class="detail-item">
                                <span class="detail-item-label">Warranty</span>
                                <span class="detail-item-value">${data.warranty === 'yes' ? '✅ Yes' : '❌ No'}</span>
                            </div>
                        </div>

                        <div class="detail-recommendation">
                            <span class="recommendation-icon">${data.recommendation.includes('SELL') ? '💰' : data.recommendation.includes('KEEP') ? '📌' : '🆕'}</span>
                            <span class="recommendation-text">${data.recommendation}</span>
                        </div>
                    </div>

                    <div class="detail-actions">
                        <a href="history.html" class="btn-secondary">← Back to History</a>
                        <a href="evaluate.html" class="btn-primary">🔄 New Evaluation</a>
                    </div>
                </div>
            `;

            container.innerHTML = html;

        } catch (error) {
            console.error("Error loading evaluation detail:", error);
            container.innerHTML = `
                <div class="history-empty">
                    <p>❌ Failed to load evaluation details.</p>
                    <a href="history.html" class="btn-primary">Go to History</a>
                </div>
            `;
        }
    }
});