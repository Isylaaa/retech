let currentBrandId = null;
let currentBrandName = "";

document.addEventListener("DOMContentLoaded", function() {

    const auth = window.auth;
    const onAuthStateChanged = window.onAuthStateChanged;
    const signOut = window.signOut;

    onAuthStateChanged(auth, function(user) {
        if (user) {
            console.log("Admin logged in:", user.email);
            loadBrands();
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

async function loadBrands() {
    const container = document.getElementById("brandsList");

    try {
        const db = window.db;
        const collection = window.collection;
        const getDocs = window.getDocs;

        const querySnapshot = await getDocs(collection(db, "deviceModels"));

        if (querySnapshot.empty) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No brands found.</p>
                </div>
            `;
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>Brand</th><th>Category</th><th>Models</th><th>Actions</th></tr></thead><tbody>';
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            const models = data.models || [];
            html += `
                <tr>
                    <td><strong>${data.brand}</strong></td>
                    <td>${data.category}</td>
                    <td>${models.length} models</td>
                    <td>
                        <button class="btn-sm btn-edit" onclick="viewModels('${docId}', '${data.brand}')">📋 View Models</button>
                        <button class="btn-sm btn-delete" onclick="deleteBrand('${docId}')">🗑️ Delete</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading brands:", error);
        container.innerHTML = `
            <div class="history-empty">
                <p>❌ Failed to load brands.</p>
            </div>
        `;
    }
}

async function addBrand() {
    const brand = document.getElementById("newBrand").value.trim();
    const category = document.getElementById("newCategory").value;

    if (!brand) {
        alert("Please enter a brand name.");
        return;
    }

    try {
        const db = window.db;
        const collection = window.collection;
        const addDoc = window.addDoc;

        await addDoc(collection(db, "deviceModels"), {
            brand: brand,
            category: category,
            models: []
        });

        document.getElementById("newBrand").value = "";
        alert("✅ Brand added successfully!");
        loadBrands();

    } catch (error) {
        console.error("Error adding brand:", error);
        alert("❌ Failed to add brand. Please try again.");
    }
}

async function deleteBrand(docId) {
    if (!confirm("Are you sure you want to delete this brand?")) return;

    try {
        const db = window.db;
        const deleteDoc = window.deleteDoc;
        const doc = window.doc;

        await deleteDoc(doc(db, "deviceModels", docId));
        alert("✅ Brand deleted successfully!");
        loadBrands();

    } catch (error) {
        console.error("Error deleting brand:", error);
        alert("❌ Failed to delete brand. Please try again.");
    }
}

async function viewModels(docId, brandName) {
    currentBrandId = docId;
    currentBrandName = brandName;

    document.getElementById("modelsSection").style.display = "block";
    document.getElementById("selectedBrandName").textContent = brandName;
    document.getElementById("brandsList").style.display = "none";
    document.getElementById("modelsTitle").scrollIntoView({ behavior: "smooth" });

    await loadModels(docId);
}

async function loadModels(docId) {
    const container = document.getElementById("modelsList");

    try {
        const db = window.db;
        const collection = window.collection;
        const getDocs = window.getDocs;
        const doc = window.doc;

        const docRef = doc(db, "deviceModels", docId);
        const docSnap = await getDocs(collection(db, "deviceModels"));

        let models = [];
        docSnap.forEach((d) => {
            if (d.id === docId) {
                const data = d.data();
                models = data.models || [];
            }
        });

        if (models.length === 0) {
            container.innerHTML = `
                <div class="history-empty">
                    <p>📭 No models found for this brand.</p>
                </div>
            `;
            return;
        }

        let html = '<table class="admin-table"><thead><tr><th>Model</th><th>Action</th></tr></thead><tbody>';
        models.forEach((model, index) => {
            html += `
                <tr>
                    <td>${model}</td>
                    <td>
                        <button class="btn-sm btn-delete" onclick="deleteModel('${docId}', ${index})">🗑️ Delete</button>
                    </td>
                </tr>
            `;
        });
        html += '</tbody></table>';
        container.innerHTML = html;

    } catch (error) {
        console.error("Error loading models:", error);
        container.innerHTML = `
            <div class="history-empty">
                <p>❌ Failed to load models.</p>
            </div>
        `;
    }
}

async function addModel() {
    const model = document.getElementById("newModel").value.trim();

    if (!model) {
        alert("Please enter a model name.");
        return;
    }

    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;
        const getDocs = window.getDocs;
        const collection = window.collection;

        const docRef = doc(db, "deviceModels", currentBrandId);
        const docSnap = await getDocs(collection(db, "deviceModels"));

        let models = [];
        docSnap.forEach((d) => {
            if (d.id === currentBrandId) {
                const data = d.data();
                models = data.models || [];
            }
        });

        models.push(model);

        await updateDoc(docRef, { models: models });

        document.getElementById("newModel").value = "";
        alert("✅ Model added successfully!");
        await loadModels(currentBrandId);

    } catch (error) {
        console.error("Error adding model:", error);
        alert("❌ Failed to add model. Please try again.");
    }
}

async function deleteModel(docId, index) {
    if (!confirm("Are you sure you want to delete this model?")) return;

    try {
        const db = window.db;
        const doc = window.doc;
        const updateDoc = window.updateDoc;
        const getDocs = window.getDocs;
        const collection = window.collection;

        const docRef = doc(db, "deviceModels", docId);
        const docSnap = await getDocs(collection(db, "deviceModels"));

        let models = [];
        docSnap.forEach((d) => {
            if (d.id === docId) {
                const data = d.data();
                models = data.models || [];
            }
        });

        models.splice(index, 1);

        await updateDoc(docRef, { models: models });
        alert("✅ Model deleted successfully!");
        await loadModels(docId);

    } catch (error) {
        console.error("Error deleting model:", error);
        alert("❌ Failed to delete model. Please try again.");
    }
}

function closeModels() {
    document.getElementById("modelsSection").style.display = "none";
    document.getElementById("brandsList").style.display = "block";
    currentBrandId = null;
    currentBrandName = "";
}