function displayStores(stores) {

    const result = document.getElementById("result");

    if (stores.length === 0) {

        result.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏪</div>
                <h3>No Nearby Stores Found</h3>
                <p>No stores were found within the search radius.</p>
            </div>
        `;

        return;
    }

    result.innerHTML = "";

    stores.forEach(store => {

        const card = document.createElement("div");

        card.className = "store-card";

        const latitude = parseFloat(store.latitude);
        const longitude = parseFloat(store.longitude);

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
                class="view-location-btn"
                onclick="viewLocation(${latitude}, ${longitude})">

                🗺️ View Location

            </button>
        `;

        result.appendChild(card);
    });
}
function viewLocation(latitude, longitude) {

    const mapUrl =
        `https://www.google.com/maps?q=${latitude},${longitude}`;

    window.open(mapUrl, "_blank");
}