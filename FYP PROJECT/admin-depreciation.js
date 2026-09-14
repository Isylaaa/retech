let allBrands = [];
let selectedBrandDocId = null;

document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("Admin logged in:", user.email);
            loadBrandFilter();
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

async function loadBrandFilter() {
    const brandSelect = document.getElementById("brandFilter");

    try {
        const db = window.db;
        const collection = window.collection;
        const getDocs = window.getDocs;

        const querySnapshot = await getDocs(collection(db, "deviceModels"));

        if (querySnapshot.empty) {
            brandSelect.innerHTML = '<option value="">No brands found</option>';
            return;
        }

        allBrands = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            allBrands.push({
                id: doc.id,
                brand: data.brand,
                category: data.category,
                data: data
            });
        });

        allBrands.sort((a, b) => a.brand.localeCompare(b.brand));

        brandSelect.innerHTML = '<option value="">-- Select a brand --</option>';
        allBrands.forEach((item) => {
            const option = document.createElement("option");
            option.value = item.id;
            option.textContent = `${item.brand} (${item.category})`;
            brandSelect.appendChild(option);
        });

        console.log(`Loaded ${allBrands.length} brands`);

    } catch (error) {
        console.error("Error loading brands:", error);
        brandSelect.innerHTML = '<option value="">Error loading brands</option>';
    }
}

async function loadDepreciationForBrand() {
    const brandSelect = document.getElementById("brandFilter");
    const docId = brandSelect.value;
    const card = document.getElementById("depreciationCard");
    const container = document.getElementById("depreciationList");

    if (!docId) {
        card.style.display = "none";
        return;
    }

    const selectedBrand = allBrands.find(item => item.id === docId);
    if (!selectedBrand) {
        alert("Brand not found.");
        return;
    }

    selectedBrandDocId = docId;

    card.style.display = "block";
    document.getElementById("selectedBrandName").textContent = selectedBrand.brand;

    const data = selectedBrand.data;
    const models = data.models || [];
    const brandRate = data.depreciationRate || 0.15;
    const brandRatePercent = Math.round(brandRate * 100);
    const modelRates = data.modelRates || {};

    if (models.length === 0) {
        container.innerHTML = `
            <div class="history-empty">
                <p>📭 No models found for this brand.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="brand-depreciation-card">
            <div class="brand-header">
                <div>
                    <h4>${selectedBrand.brand} <span class="category-tag">${selectedBrand.category}</span></h4>
                </div>
                <div class="brand-default-rate">
                    Default Rate: <strong>${brandRatePercent}%</strong>
                    <button class="btn-sm btn-edit" onclick="updateBrandRate('${docId}', ${brandRatePercent})">✏️ Edit Default</button>
                </div>
            </div>
            <p style="margin: 10px 0; color: #666; font-size: 13px;">
                💡 Enter rate as percentage (e.g., 10 for 10%). Models without a rate use the <strong>brand default</strong>.
            </p>
            <table class="admin-table model-rate-table">
                <thead>
                    <tr>
                        <th>Model</th>
                        <th>Current Rate</th>
                        <th>New Rate (%)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
    `;

    models.forEach((model) => {
        const modelRate = modelRates[model];
        const currentRate = modelRate !== undefined ? Math.round(modelRate * 100) : null;
        const displayRate = currentRate !== null ? `${currentRate}%` : `(${brandRatePercent}% default)`;
        const rateClass = currentRate !== null ? 'custom' : 'default';

        html += `
            <tr>
                <td><strong>${model}</strong></td>
                <td><span class="rate-badge ${rateClass}">${displayRate}</span></td>
                <td>
                    <input type="number" id="rate_${docId}_${model.replace(/\s/g, '_')}" class="rate-input" 
                           placeholder="e.g. 10" min="0" max="100" />
                </td>
                <td>
                    <button class="btn-sm btn-edit" onclick="updateModelRate('${docId}', '${model.replace(/'/g, "\\'")}')">💾 Update</button>
                    ${currentRate !== null ? `<button class="btn-sm btn-delete" onclick="removeModelRate('${docId}', '${model.replace(/'/g, "\\'")}')">🗑️ Remove</button>` : ''}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
    console.log(`Loaded ${models.length} models for ${selectedBrand.brand}`);
}

async function updateBrandRate(docId, currentRate) {
    const newRate = prompt(`Enter new default rate for this brand (current: ${currentRate}%):`, currentRate);
    if (newRate === null) return;

    const rateValue = parseFloat(newRate);
    if (isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
        alert("Please enter a valid rate between 0 and 100.");
        return;
    }

    const rateDecimal = rateValue / 100;

    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;

        const docRef = doc(db, "deviceModels", docId);
        await updateDoc(docRef, {
            depreciationRate: rateDecimal
        });

        // --- BROADCAST NOTIFICATION ---
        const selectedBrand = allBrands.find(item => item.id === docId);
        await broadcastNotification(
            `${selectedBrand?.brand || "Unknown"} brand`,
            `Default rate changed to ${rateValue}%`
        );

        alert(`✅ Brand default rate updated to ${rateValue}%! All users notified.`);
        loadDepreciationForBrand();

    } catch (error) {
        console.error("Error updating brand rate:", error);
        alert("❌ Failed to update brand rate. Please try again.");
    }
}

async function updateModelRate(docId, modelName) {
    const inputId = `rate_${docId}_${modelName.replace(/\s/g, '_')}`;
    const input = document.getElementById(inputId);
    const rateValue = parseFloat(input.value);

    if (!rateValue || isNaN(rateValue) || rateValue < 0 || rateValue > 100) {
        alert("Please enter a valid rate between 0 and 100.");
        return;
    }

    const rateDecimal = rateValue / 100;

    if (!confirm(`Set depreciation rate to ${rateValue}% for "${modelName}"?`)) return;

    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;
        const getDocs = window.getDocs;
        const collection = window.collection;

        const docRef = doc(db, "deviceModels", docId);
        
        const selectedBrand = allBrands.find(item => item.id === docId);
        if (!selectedBrand) {
            alert("Brand not found.");
            return;
        }

        let modelRates = {};
        const docSnap = await getDocs(collection(db, "deviceModels"));
        docSnap.forEach((d) => {
            if (d.id === docId) {
                const data = d.data();
                modelRates = data.modelRates || {};
            }
        });

        modelRates[modelName] = rateDecimal;
        await updateDoc(docRef, {
            modelRates: modelRates
        });

        // --- BROADCAST NOTIFICATION ---
        await broadcastNotification(
            `${selectedBrand.brand} ${modelName}`,
            `Depreciation rate changed to ${rateValue}%`
        );

        alert(`✅ Rate for "${modelName}" updated to ${rateValue}%! All users notified.`);
        input.value = "";
        loadDepreciationForBrand();

    } catch (error) {
        console.error("Error updating model rate:", error);
        alert("❌ Failed to update model rate. Please try again.");
    }
}

async function removeModelRate(docId, modelName) {
    if (!confirm(`Remove custom rate for "${modelName}"? It will use the brand default.`)) return;

    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;
        const getDocs = window.getDocs;
        const collection = window.collection;

        const docRef = doc(db, "deviceModels", docId);

        let modelRates = {};
        const docSnap = await getDocs(collection(db, "deviceModels"));
        docSnap.forEach((d) => {
            if (d.id === docId) {
                const data = d.data();
                modelRates = data.modelRates || {};
            }
        });

        delete modelRates[modelName];
        await updateDoc(docRef, {
            modelRates: modelRates
        });

        alert(`✅ Custom rate removed for "${modelName}". Using brand default.`);
        loadDepreciationForBrand();

    } catch (error) {
        console.error("Error removing model rate:", error);
        alert("❌ Failed to remove model rate. Please try again.");
    }
}

// ============================================================
// BROADCAST NOTIFICATION TO ALL USERS
// ============================================================

async function broadcastNotification(deviceName, changeMessage) {
    try {
        console.log("🔍 broadcastNotification STARTED");
        console.log("Device:", deviceName);
        console.log("Message:", changeMessage);
        
        const db = window.db;
        const collection = window.collection;
        const addDoc = window.addDoc;
        const serverTimestamp = window.serverTimestamp;
        const getDocs = window.getDocs;

        // Get all unique users from evaluations
        const evalSnapshot = await getDocs(collection(db, "evaluations"));
        const users = new Set();

        evalSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId) {
                users.add(data.userId);
            }
        });

        console.log("👥 Users found:", users.size);

        if (users.size === 0) {
            console.log("No users found to notify.");
            return;
        }

        let count = 0;
        for (const userId of users) {
            await addDoc(collection(db, "notifications"), {
                userId: userId,
                title: `📢 Rate Update: ${deviceName}`,
                message: `The depreciation rate for ${deviceName} has been updated. Check your device values!`,
                changeMessage: changeMessage,
                read: false,
                createdAt: serverTimestamp()
            });
            count++;
            console.log(`✅ Notification ${count}/${users.size} created for ${userId}`);
        }

        console.log(`✅ Notifications sent to ${count} users!`);

    } catch (error) {
        console.error("❌ Error broadcasting notifications:", error);
        console.error("Error details:", error.message);
    }
}

// ============================================================
// SEND TEST NOTIFICATION
// ============================================================

async function sendTestNotification() {
    try {
        console.log("🔍 Manual test started...");

        const db = window.db;
        const collection = window.collection;
        const addDoc = window.addDoc;
        const serverTimestamp = window.serverTimestamp;
        const getDocs = window.getDocs;

        const evalSnapshot = await getDocs(collection(db, "evaluations"));
        const users = new Set();

        evalSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId) {
                users.add(data.userId);
            }
        });

        console.log("👥 Users found:", users.size);

        if (users.size === 0) {
            alert("❌ No users found. Create an evaluation first.");
            return;
        }

        let count = 0;
        for (const userId of users) {
            await addDoc(collection(db, "notifications"), {
                userId: userId,
                title: "📢 Test Notification",
                message: "This is a test notification from the admin panel.",
                changeMessage: "Test message",
                read: false,
                createdAt: serverTimestamp()
            });
            count++;
            console.log(`✅ Notification ${count} created for ${userId}`);
        }

        alert(`✅ Test notifications sent to ${count} users!`);
        console.log(`✅ Test notifications sent to ${count} users!`);

    } catch (error) {
        console.error("❌ Error sending test notification:", error);
        alert("❌ Failed to send test notification. Check console.");
    }
}