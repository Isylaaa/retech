let userEvaluations = [];
let device1Data = null;
let device2Data = null;

document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("User logged in:", user.email);
            loadUserHistory(user.email);
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

async function loadUserHistory(userEmail) {
    try {
        const db = window.db;
        const collection = window.collection;
        const query = window.query;
        const where = window.where;
        const getDocs = window.getDocs;

        const q = query(
            collection(db, "evaluations"),
            where("userId", "==", userEmail)
        );

        const querySnapshot = await getDocs(q);
        userEvaluations = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            userEvaluations.push({
                id: doc.id,
                ...data
            });
        });

        // Sort by date (newest first)
        userEvaluations.sort((a, b) => {
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

        populateDropdowns();
        console.log(`Loaded ${userEvaluations.length} evaluations for comparison`);

    } catch (error) {
        console.error("Error loading history:", error);
    }
}

function populateDropdowns() {
    const select1 = document.getElementById("device1Select");
    const select2 = document.getElementById("device2Select");

    // Clear existing options
    select1.innerHTML = '<option value="">-- Select a device --</option>';
    select2.innerHTML = '<option value="">-- Select a device --</option>';

    if (userEvaluations.length === 0) {
        select1.innerHTML = '<option value="">No evaluations found</option>';
        select2.innerHTML = '<option value="">No evaluations found</option>';
        return;
    }

    userEvaluations.forEach((evalData, index) => {
        const label = `${evalData.brand} ${evalData.model} (RM ${evalData.estimatedValue.toLocaleString()})`;
        
        const option1 = document.createElement("option");
        option1.value = index;
        option1.textContent = label;
        select1.appendChild(option1);

        const option2 = document.createElement("option");
        option2.value = index;
        option2.textContent = label;
        select2.appendChild(option2);
    });
}

function loadDevice1() {
    const index = parseInt(document.getElementById("device1Select").value);
    if (isNaN(index) || index < 0 || index >= userEvaluations.length) {
        document.getElementById("device1Display").style.display = "none";
        device1Data = null;
        updateComparison();
        return;
    }

    device1Data = userEvaluations[index];
    displayDevice("device1Display", device1Data);
    updateComparison();
}

function loadDevice2() {
    const index = parseInt(document.getElementById("device2Select").value);
    if (isNaN(index) || index < 0 || index >= userEvaluations.length) {
        document.getElementById("device2Display").style.display = "none";
        device2Data = null;
        updateComparison();
        return;
    }

    device2Data = userEvaluations[index];
    displayDevice("device2Display", device2Data);
    updateComparison();
}

function displayDevice(containerId, data) {
    const container = document.getElementById(containerId);
    container.style.display = "block";

    let date = "Unknown";
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

    let depClass = 'low';
    if (data.depreciationRate > 40) depClass = 'high';
    else if (data.depreciationRate > 20) depClass = 'medium';

    container.innerHTML = `
        <h4>${data.brand} ${data.model}</h4>
        <div class="device-specs">
            <div class="spec-row"><span class="spec-label">Category</span><span class="spec-value">${data.category}</span></div>
            <div class="spec-row"><span class="spec-label">Storage</span><span class="spec-value">${data.storage || "N/A"}</span></div>
            <div class="spec-row"><span class="spec-label">RAM</span><span class="spec-value">${data.ram || "N/A"}</span></div>
            <div class="spec-row"><span class="spec-label">Condition</span><span class="spec-value">${data.condition}</span></div>
            <div class="spec-row"><span class="spec-label">Original Price</span><span class="spec-value">RM ${data.originalPrice.toLocaleString()}</span></div>
            <div class="spec-row"><span class="spec-label">Estimated Value</span><span class="spec-value highlight">RM ${data.estimatedValue.toLocaleString()}</span></div>
            <div class="spec-row"><span class="spec-label">Depreciation</span><span class="spec-value depreciation-badge ${depClass}">-${data.depreciationRate}%</span></div>
            <div class="spec-row"><span class="spec-label">Device Age</span><span class="spec-value">${data.deviceAge} years</span></div>
            <div class="spec-row"><span class="spec-label">Warranty</span><span class="spec-value">${data.warranty === 'yes' ? '✅ Yes' : '❌ No'}</span></div>
            <div class="spec-row"><span class="spec-label">Evaluated</span><span class="spec-value">${date}</span></div>
        </div>
    `;
}

function updateComparison() {
    const resultsContainer = document.getElementById("comparisonResults");
    const compare1 = document.getElementById("compareDevice1");
    const compare2 = document.getElementById("compareDevice2");
    const recommendation = document.getElementById("compareRecommendation");

    if (!device1Data || !device2Data) {
        resultsContainer.style.display = "none";
        return;
    }

    resultsContainer.style.display = "block";

    // Show comparison cards
    compare1.innerHTML = buildComparisonCard(device1Data, "Device 1");
    compare2.innerHTML = buildComparisonCard(device2Data, "Device 2");

    // Generate recommendation
    const diff = device2Data.estimatedValue - device1Data.estimatedValue;
    const percentDiff = Math.round((diff / device1Data.estimatedValue) * 100);

    let recommendationText = "";
    let recommendationIcon = "";
    let recommendationClass = "";

    if (diff > 0 && percentDiff > 10) {
        recommendationText = `✅ UPGRADE WORTH IT! ${device2Data.brand} ${device2Data.model} is worth RM ${diff.toLocaleString()} more (${percentDiff}% increase). Consider upgrading!`;
        recommendationIcon = "🚀";
        recommendationClass = "upgrade";
    } else if (diff > 0) {
        recommendationText = `📊 MODERATE IMPROVEMENT. ${device2Data.brand} ${device2Data.model} is worth RM ${diff.toLocaleString()} more (${percentDiff}% increase). Only upgrade if you need the extra features.`;
        recommendationIcon = "📊";
        recommendationClass = "moderate";
    } else if (diff === 0) {
        recommendationText = `⚖️ EQUAL VALUE. Both devices have the same estimated value. Keep your current device.`;
        recommendationIcon = "⚖️";
        recommendationClass = "equal";
    } else {
        const positiveDiff = Math.abs(diff);
        const positivePercent = Math.abs(percentDiff);
        recommendationText = `🛑 NOT WORTH IT! Your current device (${device1Data.brand} ${device1Data.model}) is worth RM ${positiveDiff.toLocaleString()} more (${positivePercent}% higher). Keep your current device!`;
        recommendationIcon = "🛑";
        recommendationClass = "downgrade";
    }

    recommendation.innerHTML = `
        <div class="recommendation-card ${recommendationClass}">
            <div class="recommendation-icon">${recommendationIcon}</div>
            <div class="recommendation-text">${recommendationText}</div>
        </div>
    `;
}

function buildComparisonCard(data, label) {
    let depClass = 'low';
    if (data.depreciationRate > 40) depClass = 'high';
    else if (data.depreciationRate > 20) depClass = 'medium';

    return `
        <h4>${data.brand} ${data.model}</h4>
        <div class="device-specs">
            <div class="spec-row"><span class="spec-label">Category</span><span class="spec-value">${data.category}</span></div>
            <div class="spec-row"><span class="spec-label">Storage</span><span class="spec-value">${data.storage || "N/A"}</span></div>
            <div class="spec-row"><span class="spec-label">RAM</span><span class="spec-value">${data.ram || "N/A"}</span></div>
            <div class="spec-row"><span class="spec-label">Condition</span><span class="spec-value">${data.condition}</span></div>
            <div class="spec-row"><span class="spec-label">Original Price</span><span class="spec-value">RM ${data.originalPrice.toLocaleString()}</span></div>
            <div class="spec-row"><span class="spec-label">Estimated Value</span><span class="spec-value highlight">RM ${data.estimatedValue.toLocaleString()}</span></div>
            <div class="spec-row"><span class="spec-label">Depreciation</span><span class="spec-value depreciation-badge ${depClass}">-${data.depreciationRate}%</span></div>
            <div class="spec-row"><span class="spec-label">Device Age</span><span class="spec-value">${data.deviceAge} years</span></div>
        </div>
    `;
}