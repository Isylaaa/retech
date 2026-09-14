document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            const userName = user.displayName || user.email;
            document.getElementById("userName").textContent = userName;
            localStorage.setItem("retechUserEmail", user.email);
            if (user.displayName) {
                localStorage.setItem("retechUserName", user.displayName);
            }
            loadRecentEvaluations(user.email);
            loadNotificationCount(user.email);
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
                    console.log("User logged out");
                    localStorage.removeItem("retechUserEmail");
                    localStorage.removeItem("retechUserName");
                    window.location.href = "index.html";
                })
                .catch((error) => {
                    console.error("Logout error:", error);
                    alert("Failed to logout. Please try again.");
                });
        });
    }

    window.startEvaluation = function() {
        window.location.href = "evaluate.html";
    };

    window.viewEvaluation = function(docId) {
        localStorage.setItem("viewEvaluationId", docId);
        window.location.href = "history-detail.html";
    };

    async function loadRecentEvaluations(userEmail) {
        const container = document.getElementById("recentEvaluationsList");

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
            const limit = window.limit;

            console.log("Loading evaluations for user:", userEmail);

            const q = query(
                collection(db, "evaluations"),
                where("userId", "==", userEmail),
                limit(10)
            );

            const querySnapshot = await getDocs(q);
            console.log("Query snapshot size:", querySnapshot.size);

            if (querySnapshot.empty) {
                container.innerHTML = `
                    <div class="history-empty">
                        <p>📭 No evaluations yet. Start your first evaluation now!</p>
                    </div>
                `;
                return;
            }

            const evaluations = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const docId = doc.id;
                evaluations.push({ id: docId, ...data });
            });

            evaluations.sort((a, b) => {
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

            const recentEvaluations = evaluations.slice(0, 3);

            let html = '<div class="recent-list">';
            recentEvaluations.forEach((data) => {
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
                                const match = data.createdAt.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
                                if (match) {
                                    date = `${match[1]} ${match[2]} ${match[3]}`;
                                } else {
                                    date = data.createdAt.split('at')[0].trim();
                                }
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
            console.log("Recent evaluations displayed successfully!");

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

    async function loadNotificationCount(userEmail) {
        try {
            const db = window.db;
            const collection = window.collection;
            const query = window.query;
            const where = window.where;
            const getDocs = window.getDocs;

            const q = query(
                collection(db, "notifications"),
                where("userId", "==", userEmail),
                where("read", "==", false)
            );

            const querySnapshot = await getDocs(q);
            const count = querySnapshot.size;

            const badge = document.getElementById("notificationBadge");
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.style.display = "inline-block";
            } else {
                badge.style.display = "none";
            }

            console.log(`📬 Notification count: ${count}`);

        } catch (error) {
            console.error("Error loading notification count:", error);
        }
    }

    const track = document.getElementById("carouselTrack");
    const dots = document.querySelectorAll(".dot");
    let currentIndex = 0;
    let autoSlideInterval;

    function goToSlide(index) {
        track.style.transform = `translateX(-${index * 100}%)`;
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });
        currentIndex = index;
    }

    function nextSlide() {
        goToSlide((currentIndex + 1) % dots.length);
    }

    dots.forEach((dot) => {
        dot.addEventListener("click", function() {
            const index = parseInt(this.getAttribute("data-index"));
            goToSlide(index);
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(nextSlide, 3000);
        });
    });

    autoSlideInterval = setInterval(nextSlide, 3000);
    const carouselContainer = document.querySelector(".carousel-container");
    if (carouselContainer) {
        carouselContainer.addEventListener("mouseenter", () => clearInterval(autoSlideInterval));
        carouselContainer.addEventListener("mouseleave", () => {
            autoSlideInterval = setInterval(nextSlide, 3000);
        });
    }

    console.log("Dashboard loaded successfully!");
});