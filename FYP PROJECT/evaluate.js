// ============================================================
// AUTH + DOM READY
// ============================================================

document.addEventListener("DOMContentLoaded", function () {
    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function (user) {
        if (!user) {
            console.log("No user logged in. Redirecting to login...");
            window.location.href = "index.html";
        } else {
            console.log("User logged in:", user.email);
        }
    });

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            signOut(auth)
                .then(() => {
                    window.location.href = "index.html";
                })
                .catch(() => {
                    alert("Failed to logout. Please try again.");
                });
        });
    }

    const step1Next = document.getElementById("step1Next");
    if (step1Next) step1Next.disabled = true;
});

// ============================================================
// GLOBALS
// ============================================================

let selectedCategory = "";
let selectedConditions = {
    overall: "",
    battery: "",
    screen: "",
    functionality: ""
};
let currentUserEmail = "";
let currentBrandData = null;

// ============================================================
// LOAD BRANDS FROM FIRESTORE
// ============================================================

async function loadBrandsForCategory(category) {
    const brandSelect = document.getElementById("brand");
    brandSelect.innerHTML = '<option value="">Loading brands...</option>';
    brandSelect.disabled = true;

    console.log("Loading brands for category:", category);

    try {
        const db = window.db;
        const collection = window.collection;
        const query = window.query;
        const where = window.where;
        const getDocs = window.getDocs;

        const q = query(
            collection(db, "deviceModels"),
            where("category", "==", category)
        );

        const querySnapshot = await getDocs(q);
        console.log("Query returned:", querySnapshot.size, "documents");

        const brands = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.brand) {
                brands.push(data.brand);
            }
        });

        console.log("Brands found:", brands);

        if (brands.length === 0) {
            brandSelect.innerHTML = '<option value="">No brands found for this category</option>';
            brandSelect.disabled = false;
            return;
        }

        brands.sort();
        brandSelect.innerHTML = '<option value="">Select a brand</option>';
        brands.forEach((brand) => {
            const option = document.createElement("option");
            option.value = brand;
            option.textContent = brand;
            brandSelect.appendChild(option);
        });

        brandSelect.disabled = false;

        // Reset model and spec dropdowns
        const modelSelect = document.getElementById("model");
        modelSelect.innerHTML = '<option value="">Select a model</option>';
        modelSelect.disabled = true;
        document.getElementById("storage").innerHTML = '<option value="">Select storage</option>';
        document.getElementById("storage").disabled = true;
        document.getElementById("ram").innerHTML = '<option value="">Select RAM</option>';
        document.getElementById("ram").disabled = true;

        console.log(`✅ Loaded ${brands.length} brands for category: ${category}`);
    } catch (error) {
        console.error("❌ Error loading brands:", error);
        brandSelect.innerHTML = '<option value="">Error loading brands</option>';
        brandSelect.disabled = false;
        alert("Failed to load brands. Please check Firestore connection.");
    }
}

// ============================================================
// LOAD MODELS FROM FIRESTORE
// ============================================================

async function loadModels() {
    const category = selectedCategory;
    const brand = document.getElementById("brand").value;
    const modelSelect = document.getElementById("model");
    const storageSelect = document.getElementById("storage");
    const ramSelect = document.getElementById("ram");

    if (!brand) {
        modelSelect.innerHTML = '<option value="">Select a model</option>';
        modelSelect.disabled = true;
        storageSelect.innerHTML = '<option value="">Select storage</option>';
        storageSelect.disabled = true;
        ramSelect.innerHTML = '<option value="">Select RAM</option>';
        ramSelect.disabled = true;
        return;
    }

    modelSelect.innerHTML = '<option value="">Loading models...</option>';
    modelSelect.disabled = true;

    console.log("Loading models for brand:", brand, "category:", category);

    try {
        const db = window.db;
        const collection = window.collection;
        const query = window.query;
        const where = window.where;
        const getDocs = window.getDocs;

        const q = query(
            collection(db, "deviceModels"),
            where("category", "==", category),
            where("brand", "==", brand)
        );

        const querySnapshot = await getDocs(q);
        console.log("Models query returned:", querySnapshot.size, "documents");

        if (querySnapshot.empty) {
            modelSelect.innerHTML = '<option value="">No models found</option>';
            modelSelect.disabled = false;
            return;
        }

        let brandData = null;
        querySnapshot.forEach((doc) => {
            brandData = doc.data();
        });

        if (!brandData || !brandData.models) {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            modelSelect.disabled = false;
            return;
        }

        // Convert to array if string
        let models = brandData.models;
        if (typeof models === 'string') {
            try { models = JSON.parse(models); } catch (e) { models = []; }
        }

        // Convert storage to array if string
        let storage = brandData.storage || [];
        if (typeof storage === 'string') {
            try { storage = JSON.parse(storage); } catch (e) { storage = []; }
        }

        // Convert ram to array if string
        let ram = brandData.ram || [];
        if (typeof ram === 'string') {
            try { ram = JSON.parse(ram); } catch (e) { ram = []; }
        }

        currentBrandData = brandData;

        console.log("Models found:", models);
        console.log("Storage:", storage);
        console.log("RAM:", ram);
        console.log("Model rates:", brandData.modelRates || {});

        // Populate models
        modelSelect.innerHTML = '<option value="">Select a model</option>';
        if (Array.isArray(models) && models.length > 0) {
            models.forEach((model) => {
                const option = document.createElement("option");
                option.value = model;
                option.textContent = model;
                modelSelect.appendChild(option);
            });
            modelSelect.disabled = false;
        } else {
            modelSelect.innerHTML = '<option value="">No models available</option>';
            modelSelect.disabled = false;
        }

        // Populate storage
        storageSelect.innerHTML = '<option value="">Select storage</option>';
        if (Array.isArray(storage) && storage.length > 0) {
            storage.forEach((item) => {
                const option = document.createElement("option");
                option.value = item;
                option.textContent = item;
                storageSelect.appendChild(option);
            });
            storageSelect.disabled = false;
        } else {
            storageSelect.innerHTML = '<option value="">No storage options</option>';
            storageSelect.disabled = true;
        }

        // Populate RAM
        ramSelect.innerHTML = '<option value="">Select RAM</option>';
        if (Array.isArray(ram) && ram.length > 0) {
            ram.forEach((item) => {
                const option = document.createElement("option");
                option.value = item;
                option.textContent = item;
                ramSelect.appendChild(option);
            });
            ramSelect.disabled = false;
        } else {
            ramSelect.innerHTML = '<option value="">No RAM options</option>';
            ramSelect.disabled = true;
        }

        console.log(`✅ Loaded ${models.length} models for ${brand}`);

    } catch (error) {
        console.error("❌ Error loading models:", error);
        modelSelect.innerHTML = '<option value="">Error loading models</option>';
        modelSelect.disabled = false;
    }
}

// ============================================================
// DEPRECIATION RATES (HARDCODED FALLBACKS)
// ============================================================

const depreciationRates = {
    "Apple": 0.10,
    "Samsung": 0.15,
    "Google": 0.18,
    "Xiaomi": 0.20,
    "OnePlus": 0.18,
    "Oppo": 0.20,
    "Vivo": 0.20,
    "Nothing": 0.18,
    "Realme": 0.22,
    "Huawei": 0.22,
    "Sony": 0.18,
    "Motorola": 0.22,
    "ASUS": 0.20,
    "Nokia": 0.25,
    "HTC": 0.22,
    "Dell": 0.15,
    "HP": 0.15,
    "Lenovo": 0.15,
    "Acer": 0.18,
    "MSI": 0.15,
    "Razer": 0.15,
    "Samsung": 0.15,
    "Microsoft": 0.15,
    "Google Laptop": 0.18,
    "Garmin": 0.15,
    "Fitbit": 0.18,
    "TicWatch": 0.20
};

// ============================================================
// GET DEPRECIATION RATE (MODEL-LEVEL SUPPORT)
// ============================================================

function getDepreciationRate(brand, model, brandData) {
    // Check if model has a specific rate
    if (brandData && brandData.modelRates && brandData.modelRates[model] !== undefined) {
        console.log(`✅ Using model-specific rate for ${model}: ${brandData.modelRates[model] * 100}%`);
        return brandData.modelRates[model];
    }
    
    // Fallback to brand rate
    if (depreciationRates[brand] !== undefined) {
        console.log(`ℹ️ Using brand default rate for ${brand}: ${depreciationRates[brand] * 100}%`);
        return depreciationRates[brand];
    }
    
    console.warn(`⚠️ No depreciation rate found for "${brand}", using default 15%`);
    return 0.15;
}

// ============================================================
// SPEC MULTIPLIERS
// ============================================================

function getStorageMultiplier(storage) {
    const multipliers = {
        "64GB": 0.85,
        "128GB": 0.90,
        "256GB": 1.00,
        "512GB": 1.10,
        "1TB": 1.20,
        "2TB": 1.30
    };
    return multipliers[storage] || 1.00;
}

function getRamMultiplier(ram) {
    const multipliers = {
        "4GB": 0.85,
        "6GB": 0.90,
        "8GB": 1.00,
        "12GB": 1.05,
        "16GB": 1.10,
        "24GB": 1.15,
        "32GB": 1.20,
        "64GB": 1.25
    };
    return multipliers[ram] || 1.00;
}

// ============================================================
// STEP NAVIGATION
// ============================================================

function goToStep(step) {
    document.getElementById("step1").style.display = "none";
    document.getElementById("step2").style.display = "none";
    document.getElementById("step3").style.display = "none";
    document.getElementById("stepResult").style.display = "none";

    if (step === 1) document.getElementById("step1").style.display = "block";
    else if (step === 2) document.getElementById("step2").style.display = "block";
    else if (step === 3) document.getElementById("step3").style.display = "block";
    else if (step === 4) document.getElementById("stepResult").style.display = "block";

    updateProgress(step);

    const container = document.querySelector(".evaluate-container");
    if (container) container.scrollIntoView({ behavior: "smooth" });

    if (step === 2 && selectedCategory) {
        loadBrandsForCategory(selectedCategory);
    }
}

function updateProgress(step) {
    const indicators = [
        document.getElementById("step1Indicator"),
        document.getElementById("step2Indicator"),
        document.getElementById("step3Indicator")
    ];
    const lines = [
        document.getElementById("line1"),
        document.getElementById("line2")
    ];

    indicators.forEach((el) => el && el.classList.remove("active"));
    lines.forEach((el) => el && el.classList.remove("active"));

    for (let i = 0; i < step - 1 && i < indicators.length; i++) {
        if (indicators[i]) indicators[i].classList.add("active");
        if (i < lines.length && lines[i]) lines[i].classList.add("active");
    }
    if (step - 1 < indicators.length && indicators[step - 1]) {
        indicators[step - 1].classList.add("active");
    }
}

// ============================================================
// STEP 1: CATEGORY
// ============================================================

function selectCategory(element) {
    document.querySelectorAll(".category-card").forEach((card) => {
        card.classList.remove("selected");
    });
    element.classList.add("selected");
    selectedCategory = element.dataset.category;

    const step1Next = document.getElementById("step1Next");
    if (step1Next) step1Next.disabled = false;

    console.log("Category selected:", selectedCategory);
}

// ============================================================
// STEP 3: CONDITION
// ============================================================

function selectCondition(element, type) {
    const parent = element.closest(".condition-group");
    if (parent) {
        parent.querySelectorAll(".condition-btn").forEach((btn) => {
            btn.classList.remove("selected");
        });
    }
    element.classList.add("selected");
    selectedConditions[type] = element.dataset.condition;
    console.log("Condition selected:", type, element.dataset.condition);
}

// ============================================================
// CALCULATE VALUE (UPDATED WITH MODEL-LEVEL DEPRECIATION)
// ============================================================

function calculateValue() {
    // Check conditions
    if (!selectedConditions.overall || !selectedConditions.battery ||
        !selectedConditions.screen || !selectedConditions.functionality) {
        alert("Please select all condition options before calculating.");
        return;
    }

    // Get form values
    const brand = document.getElementById("brand").value;
    const model = document.getElementById("model").value;
    const storage = document.getElementById("storage").value;
    const ram = document.getElementById("ram").value;
    const originalPrice = parseFloat(document.getElementById("originalPrice").value);
    const deviceAge = parseFloat(document.getElementById("deviceAge").value);
    const warranty = document.getElementById("warranty").value;

    // Validate
    if (!brand || !model) {
        alert("Please select a brand and model.");
        return;
    }
    if (!storage) {
        alert("Please select storage.");
        return;
    }
    
    // Skip RAM validation for Smartwatches
    if (selectedCategory !== "Smartwatch") {
        if (!ram) {
            alert("Please select RAM.");
            return;
        }
    }
    
    if (!originalPrice || originalPrice <= 0) {
        alert("Please enter a valid original price.");
        return;
    }
    if (deviceAge === undefined || deviceAge < 0) {
        alert("Please enter a valid device age.");
        return;
    }

    const auth = window.auth;
    const user = auth.currentUser;
    if (user) currentUserEmail = user.email;

    // --- CALCULATION ---
    let baseValue = originalPrice;

    // 1. Model-level depreciation (brand fallback)
    const depRate = getDepreciationRate(brand, model, currentBrandData);
    const ageDepreciation = depRate * deviceAge;
    baseValue = baseValue * (1 - ageDepreciation);

    // 2. Storage multiplier
    const storageMultiplier = getStorageMultiplier(storage);
    baseValue = baseValue * storageMultiplier;

    // 3. RAM multiplier (skip if no RAM selected)
    if (ram) {
        const ramMultiplier = getRamMultiplier(ram);
        baseValue = baseValue * ramMultiplier;
    }

    // 4. Condition multipliers
    const conditionMultipliers = {
        overall: { excellent: 1.0, good: 0.85, fair: 0.70, poor: 0.50 },
        battery: { excellent: 1.0, good: 0.90, poor: 0.70 },
        screen: { "no-damage": 1.0, "minor-scratches": 0.90, cracked: 0.70 },
        functionality: { "fully-functional": 1.0, "minor-issues": 0.80, "major-issues": 0.50 }
    };

    let conditionMultiplier = 1.0;
    for (const key in selectedConditions) {
        const value = selectedConditions[key];
        if (conditionMultipliers[key] && conditionMultipliers[key][value]) {
            conditionMultiplier *= conditionMultipliers[key][value];
        }
    }
    baseValue = baseValue * conditionMultiplier;

    // 5. Warranty bonus
    if (warranty === "yes") baseValue = baseValue * 1.05;

    // 6. Category adjustments
    const categoryMultipliers = {
        Smartphone: 1.0,
        Laptop: 0.90,
        Tablet: 0.85,
        Smartwatch: 0.80
    };
    if (categoryMultipliers[selectedCategory]) {
        baseValue = baseValue * categoryMultipliers[selectedCategory];
    }

    // 7. Market factor (placeholder)
    const marketFactor = 1.0;
    baseValue = baseValue * marketFactor;

    // Final values
    const estimatedValue = Math.round(baseValue);
    const depreciationPercent = Math.round((1 - estimatedValue / originalPrice) * 100);

    // --- DISPLAY RESULT ---
    document.getElementById("resultAmount").textContent = `RM ${estimatedValue.toLocaleString()}`;
    document.getElementById("resultDepreciation").textContent = `${depreciationPercent}%`;
    document.getElementById("resultOriginalPrice").textContent = `RM ${originalPrice.toLocaleString()}`;
    document.getElementById("resultAge").textContent = `${deviceAge} years`;
    document.getElementById("resultStorage").textContent = storage || "N/A";
    document.getElementById("resultRam").textContent = ram || "N/A";

    const conditionLabels = {
        overall: { excellent: "Excellent", good: "Good", fair: "Fair", poor: "Poor" },
        battery: { excellent: "Excellent", good: "Good", poor: "Poor" },
        screen: { "no-damage": "No Damage", "minor-scratches": "Minor Scratches", cracked: "Cracked" },
        functionality: { "fully-functional": "Fully Functional", "minor-issues": "Minor Issues", "major-issues": "Major Issues" }
    };
    const overallLabel = conditionLabels.overall[selectedConditions.overall] || "-";
    document.getElementById("resultCondition").textContent = overallLabel;

    // Recommendation
    const recommendationEl = document.getElementById("resultRecommendation");
    let recommendation = "";
    let recommendationIcon = "💡";

    if (estimatedValue > originalPrice * 0.6) {
        recommendation = "SELL - Your device still holds significant value!";
        recommendationIcon = "💰";
    } else if (estimatedValue > originalPrice * 0.3) {
        recommendation = "KEEP - Consider holding onto your device a bit longer.";
        recommendationIcon = "📌";
    } else {
        recommendation = "UPGRADE - Your device has depreciated significantly. Consider upgrading.";
        recommendationIcon = "🆕";
    }

    recommendationEl.innerHTML = `
        <span class="recommendation-icon">${recommendationIcon}</span>
        <span class="recommendation-text">Recommendation: ${recommendation}</span>
    `;

    // Store result for saving
    window.lastResult = {
        category: selectedCategory,
        brand,
        model,
        storage,
        ram: ram || "N/A",
        originalPrice,
        deviceAge,
        warranty,
        estimatedValue,
        depreciationRate: depreciationPercent,
        condition: overallLabel,
        conditionDetails: { ...selectedConditions },
        recommendation,
        userId: currentUserEmail,
        depreciationRateUsed: depRate
    };

    goToStep(4);
}

// ============================================================
// SAVE EVALUATION
// ============================================================

async function saveEvaluation() {
    if (!window.lastResult) {
        alert("No evaluation to save. Please calculate first.");
        return;
    }

    const result = window.lastResult;
    const saveBtn = document.querySelector(".btn-save");
    const originalText = saveBtn.textContent;

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const db = window.db;
        const addDoc = window.addDoc;
        const collection = window.collection;
        const serverTimestamp = window.serverTimestamp;

        await addDoc(collection(db, "evaluations"), {
            userId: result.userId || "anonymous",
            category: result.category,
            brand: result.brand,
            model: result.model,
            storage: result.storage || "",
            ram: result.ram || "",
            originalPrice: result.originalPrice,
            deviceAge: result.deviceAge,
            warranty: result.warranty,
            estimatedValue: result.estimatedValue,
            depreciationRate: result.depreciationRate,
            condition: result.condition,
            conditionDetails: result.conditionDetails,
            recommendation: result.recommendation,
            depreciationRateUsed: result.depreciationRateUsed,
            createdAt: serverTimestamp()
        });

        saveBtn.textContent = "✅ Saved!";
        saveBtn.style.background = "#28a745";
        saveBtn.style.color = "white";
        alert("✅ Evaluation saved successfully!");

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            saveBtn.style.background = "";
            saveBtn.style.color = "";
        }, 3000);
    } catch (error) {
        console.error("Error saving evaluation:", error);
        alert("❌ Failed to save evaluation. Please try again.");
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
        saveBtn.style.background = "";
        saveBtn.style.color = "";
    }
}

// ============================================================
// GO HOME
// ============================================================

function goHome() {
    window.location.href = "dashboard.html";
}