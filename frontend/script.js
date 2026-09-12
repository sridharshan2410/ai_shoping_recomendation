// ==========================================
// GET NEARBY STORES
// ==========================================

function findNearbyStores() {

    const locationText = document.getElementById("location");
    const result = document.getElementById("result");

    locationText.innerHTML = "📍 Getting your location...";

    if (!navigator.geolocation) {
        locationText.innerHTML =
            "❌ Geolocation is not supported by your browser.";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        getNearbyStores,
        locationError
    );
}


// ==========================================
// GET USER LOCATION AND FIND STORES
// ==========================================

function getNearbyStores(position) {

    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    const locationText = document.getElementById("location");
    const result = document.getElementById("result");

    // Save user location
    localStorage.setItem("userLat", latitude);
    localStorage.setItem("userLon", longitude);

    locationText.innerHTML =
        `📍 Your location: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    result.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⏳</div>
            <h3>Finding nearby stores...</h3>
            <p>Please wait while we search for stores near you.</p>
        </div>
    `;

    fetch(`/nearby-stores?lat=${latitude}&lon=${longitude}`)
        .then(response => {

            if (!response.ok) {
                throw new Error("Unable to fetch nearby stores");
            }

            return response.json();
        })
        .then(stores => {

            displayStores(stores);

        })
        .catch(error => {

            console.error(error);

            result.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">❌</div>
                    <h3>Something went wrong</h3>
                    <p>Unable to load nearby stores.</p>
                </div>
            `;
        });
}


// ==========================================
// DISPLAY NEARBY STORES
// ==========================================

function displayStores(stores) {

    const result = document.getElementById("result");

    if (stores.length === 0) {

        result.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏪</div>
                <h3>No Nearby Stores Found</h3>
                <p>
                    We couldn't find any stores within
                    the selected search radius.
                </p>
            </div>
        `;

        return;
    }

    result.innerHTML = "";

    stores.forEach(store => {

        const card = document.createElement("div");

        card.className = "store-card";

        card.innerHTML = `
            <div class="store-icon">
                🛒
            </div>

            <h3>${store.store_name}</h3>

            <p class="store-address">
                📍 ${store.address}
            </p>

            <div class="store-info">

                <span class="rating">
                    ⭐ ${store.rating}
                </span>

                <span class="distance">
                    📏 ${store.distance_km} km
                </span>

            </div>

            <button
                onclick="viewStoreLocation(
                    ${store.latitude},
                    ${store.longitude},
                    '${store.store_name}'
                )"
            >
                📍 View Location
            </button>
        `;

        result.appendChild(card);
    });
}


// ==========================================
// LOCATION ERROR
// ==========================================

function locationError(error) {

    const locationText = document.getElementById("location");

    if (error.code === 1) {

        locationText.innerHTML =
            "❌ Location permission denied.";

    } else if (error.code === 2) {

        locationText.innerHTML =
            "❌ Unable to determine your location.";

    } else if (error.code === 3) {

        locationText.innerHTML =
            "❌ Location request timed out.";

    } else {

        locationText.innerHTML =
            "❌ Unable to get your location.";
    }
}


// ==========================================
// VIEW STORE LOCATION
// Opens our own Leaflet GPS map
// ==========================================

function viewStoreLocation(latitude, longitude, storeName) {

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {

        alert("❌ Store location not available");
        return;
    }

    // Save selected store information
    localStorage.setItem(
        "selectedStoreLat",
        lat
    );

    localStorage.setItem(
        "selectedStoreLon",
        lon
    );

    localStorage.setItem(
        "selectedStoreName",
        storeName
    );

    // Open our own map page
    window.location.href = "/map";
}