/* =====================================================
   SHOPNEARBY AI - CUSTOMER JAVASCRIPT
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let map = null;
let userMarker = null;
let storeMarker = null;


/* =====================================================
   HELPER - ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   HELPER - SESSION ERROR
===================================================== */

function showSessionExpired(element) {

    if (!element) {
        return;
    }

    element.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                🔐
            </div>

            <h3>
                Session Expired
            </h3>

            <p>
                Please login again to continue.
            </p>

        </div>
    `;
}


/* =====================================================
   NEARBY STORES
===================================================== */

function findNearbyStores() {

    const locationText =
        document.getElementById("location");

    const result =
        document.getElementById("result");

    if (!locationText || !result) {

        console.error(
            "Location or result element not found"
        );

        return;
    }

    locationText.innerHTML =
        "📍 Getting your location...";

    result.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                📍
            </div>

            <h3>
                Getting Your Location...
            </h3>

            <p>
                Please allow location access.
            </p>

        </div>
    `;

    if (!navigator.geolocation) {

        locationText.innerHTML =
            "❌ Geolocation is not supported.";

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Location Not Supported
                </h3>

                <p>
                    Your browser does not support GPS location.
                </p>

            </div>
        `;

        return;
    }

    navigator.geolocation.getCurrentPosition(
        getNearbyStores,
        locationError,
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


/* =====================================================
   GET NEARBY STORES
===================================================== */

function getNearbyStores(position) {

    const latitude =
        position.coords.latitude;

    const longitude =
        position.coords.longitude;

    const locationText =
        document.getElementById("location");

    const result =
        document.getElementById("result");

    locationText.innerHTML = `
        📍 Your location:
        ${latitude.toFixed(5)},
        ${longitude.toFixed(5)}
    `;

    result.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                ⏳
            </div>

            <h3>
                Finding Nearby Stores...
            </h3>

            <p>
                Please wait while we search for stores near you.
            </p>

        </div>
    `;

    fetch(
        `/nearby-stores?lat=${latitude}&lon=${longitude}`,
        {
            method: "GET",
            credentials: "same-origin"
        }
    )

    .then(response => {

        if (response.status === 401) {
            throw new Error("SESSION_EXPIRED");
        }

        if (!response.ok) {
            throw new Error(
                "Unable to fetch nearby stores"
            );
        }

        return response.json();
    })

    .then(stores => {

        console.log(
            "Nearby stores:",
            stores
        );

        displayStores(stores);

    })

    .catch(error => {

        console.error(error);

        if (
            error.message ===
            "SESSION_EXPIRED"
        ) {

            showSessionExpired(result);

            return;
        }

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Something Went Wrong
                </h3>

                <p>
                    Unable to load nearby stores.
                </p>

            </div>
        `;
    });
}


/* =====================================================
   DISPLAY NEARBY STORES
===================================================== */

function displayStores(stores) {

    const result =
        document.getElementById("result");

    if (!result) {
        return;
    }

    if (
        !Array.isArray(stores) ||
        stores.length === 0
    ) {

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    🏪
                </div>

                <h3>
                    No Nearby Stores Found
                </h3>

                <p>
                    We couldn't find any stores
                    within 20 km of your location.
                </p>

            </div>
        `;

        return;
    }

    result.innerHTML = "";

    stores.forEach(store => {

        const card =
            document.createElement("div");

        card.className =
            "store-card";

        const distance =
            store.distance !== undefined
                ? store.distance
                : "N/A";

        card.innerHTML = `

            <div class="store-icon">
                🛒
            </div>

            <h3>
                ${escapeHTML(store.store_name)}
            </h3>

            <p class="store-address">
                📍 ${escapeHTML(store.address)}
            </p>

            <div class="store-info">

                <span>
                    ⭐ ${store.rating}
                </span>

                <span>
                    📏 ${distance} km
                </span>

            </div>

            <button
                class="view-location-btn"
                onclick="viewLocation(
                    ${store.latitude},
                    ${store.longitude}
                )">

                🗺️ View Location

            </button>
        `;

        result.appendChild(card);
    });
}


/* =====================================================
   LOCATION ERROR
===================================================== */

function locationError(error) {

    const locationText =
        document.getElementById("location");

    const result =
        document.getElementById("result");

    if (!locationText || !result) {
        return;
    }

    if (error.code === 1) {

        locationText.innerHTML =
            "❌ Location permission denied.";

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📍
                </div>

                <h3>
                    Location Permission Required
                </h3>

                <p>
                    Please allow location access
                    in your browser.
                </p>

            </div>
        `;
    }

    else if (error.code === 2) {

        locationText.innerHTML =
            "❌ Unable to determine your location.";

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Location Unavailable
                </h3>

                <p>
                    Unable to determine your current location.
                </p>

            </div>
        `;
    }

    else if (error.code === 3) {

        locationText.innerHTML =
            "❌ Location request timed out.";

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ⏱️
                </div>

                <h3>
                    Location Request Timed Out
                </h3>

                <p>
                    Please try again.
                </p>

            </div>
        `;
    }

    else {

        locationText.innerHTML =
            "❌ Unable to get your location.";

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Unable to Get Location
                </h3>

                <p>
                    Please try again.
                </p>

            </div>
        `;
    }
}


/* =====================================================
   PRODUCT SEARCH
===================================================== */

function searchProduct() {

    const input =
        document.getElementById("productInput");

    const result =
        document.getElementById("productResults");

    if (!input || !result) {

        console.error(
            "Product search elements not found"
        );

        return;
    }

    const productName =
        input.value.trim();

    if (productName === "") {

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>
                    Enter a Product Name
                </h3>

                <p>
                    Example: Rice, Sugar, Oil, Milk, Soap
                </p>

            </div>
        `;

        clearRecommendation();

        return;
    }

    result.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                🔄
            </div>

            <h3>
                Searching for
                ${escapeHTML(productName)}...
            </h3>

            <p>
                Please wait.
            </p>

        </div>
    `;

    fetch(
        `/search-product?name=${encodeURIComponent(productName)}`,
        {
            method: "GET",
            credentials: "same-origin"
        }
    )

    .then(response => {

        if (response.status === 401) {
            throw new Error("SESSION_EXPIRED");
        }

        if (!response.ok) {
            throw new Error(
                "Unable to search product"
            );
        }

        return response.json();
    })

    .then(products => {

        console.log(
            "Product search result:",
            products
        );

        if (
            Array.isArray(products) &&
            products.length > 0
        ) {

            displayProducts(products);

            // Get AI recommendation
            getRecommendation(productName);

        }

        else {

            displayProducts([]);

            clearRecommendation();

            // Automatically find alternatives
            getAlternativeStores(productName);
        }

    })

    .catch(error => {

        console.error(error);

        if (
            error.message ===
            "SESSION_EXPIRED"
        ) {

            showSessionExpired(result);

            clearRecommendation();

            return;
        }

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Error Searching Product
                </h3>

                <p>
                    Unable to search for the product.
                    Please try again.
                </p>

            </div>
        `;

        clearRecommendation();
    });
}


/* =====================================================
   DISPLAY PRODUCT AVAILABILITY
===================================================== */

function displayProducts(products) {

    const result =
        document.getElementById("productResults");

    if (!result) {
        return;
    }

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {

        result.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    📦
                </div>

                <h3>
                    Product Not Available
                </h3>

                <p>
                    This product is currently
                    not available in stock.
                </p>

            </div>
        `;

        return;
    }

    result.innerHTML = "";

    products.forEach(product => {

        const card =
            document.createElement("div");

        card.className =
            "product-card";

        card.innerHTML = `

            <div class="product-icon">
                📦
            </div>

            <h3>
                ${escapeHTML(product.product_name)}
            </h3>

            <p class="category">
                ${escapeHTML(product.category)}
            </p>

            <div class="price">
                ₹${Number(product.price).toFixed(2)}
            </div>

            <p class="product-store">
                🏪 ${escapeHTML(product.store_name)}
            </p>

            <p class="product-address">
                📍 ${escapeHTML(product.address)}
            </p>

            <div class="product-info">

                <span>
                    📦 Stock: ${product.quantity}
                </span>

                <span>
                    ⭐ ${product.rating}
                </span>

            </div>

            <button
                class="view-location-btn"
                onclick="viewLocation(
                    ${product.latitude},
                    ${product.longitude}
                )">

                🗺️ View Location

            </button>
        `;

        result.appendChild(card);
    });
}


/* =====================================================
   CLEAR RECOMMENDATION
===================================================== */

function clearRecommendation() {

    const recommendationResult =
        document.getElementById(
            "recommendationResult"
        );

    if (!recommendationResult) {
        return;
    }

    recommendationResult.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                🤖
            </div>

            <h3>
                Smart Recommendation
            </h3>

            <p>
                Search for a product to get
                the best store recommendation.
            </p>

        </div>
    `;
}


/* =====================================================
   AI BEST STORE RECOMMENDATION
===================================================== */

function getRecommendation(productName) {

    const recommendationResult =
        document.getElementById(
            "recommendationResult"
        );

    if (!recommendationResult) {
        return;
    }

    recommendationResult.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">
                📍
            </div>

            <h3>
                Getting Your Location...
            </h3>

            <p>
                AI needs your location to
                compare nearby stores.
            </p>

        </div>
    `;

    if (!navigator.geolocation) {

        recommendationResult.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Location Not Supported
                </h3>

                <p>
                    Your browser does not support GPS location.
                </p>

            </div>
        `;

        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;

            recommendationResult.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        🤖
                    </div>

                    <h3>
                        Finding the Best Store...
                    </h3>

                    <p>
                        Comparing price, rating,
                        stock and distance.
                    </p>

                </div>
            `;

            fetch(
                `/recommend?name=${encodeURIComponent(productName)}&lat=${latitude}&lon=${longitude}`,
                {
                    method: "GET",
                    credentials: "same-origin"
                }
            )

            .then(response => {

                if (response.status === 401) {
                    throw new Error(
                        "SESSION_EXPIRED"
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        "Unable to get recommendation"
                    );
                }

                return response.json();
            })

            .then(data => {

                console.log(
                    "AI Recommendation:",
                    data
                );

                if (
                    data.success === false &&
                    data.message
                ) {

                    recommendationResult.innerHTML = `
                        <div class="empty-state">

                            <div class="empty-icon">
                                😔
                            </div>

                            <h3>
                                Product Not Available
                            </h3>

                            <p>
                                ${escapeHTML(data.message)}
                            </p>

                        </div>
                    `;

                    return;
                }

                const store =
                    data.best_store ||
                    data.recommendation;

                if (!store) {

                    recommendationResult.innerHTML = `
                        <div class="empty-state">

                            <div class="empty-icon">
                                ❌
                            </div>

                            <h3>
                                No Recommendation Found
                            </h3>

                            <p>
                                No suitable store was found.
                            </p>

                        </div>
                    `;

                    return;
                }

                const distance =
                    store.distance !== undefined
                        ? store.distance
                        : "N/A";

                const score =
                    store.score !== undefined
                        ? store.score
                        : null;

                recommendationResult.innerHTML = `

                    <div class="recommendation-card">

                        <div class="recommendation-badge">
                            🤖 AI Recommended
                        </div>

                        <div class="recommendation-header">

                            <div class="recommendation-icon">
                                🛒
                            </div>

                            <div>

                                <h3>
                                    ${escapeHTML(store.store_name)}
                                </h3>

                                <p>
                                    📍 ${escapeHTML(store.address)}
                                </p>

                            </div>

                        </div>

                        <div class="recommendation-product">

                            <h4>
                                ${escapeHTML(store.product_name)}
                            </h4>

                            <div class="recommendation-details">

                                <span>
                                    💰 ₹${Number(store.price).toFixed(2)}
                                </span>

                                <span>
                                    ⭐ ${store.rating}
                                </span>

                                <span>
                                    📦 ${store.quantity} available
                                </span>

                                <span>
                                    📏 ${distance} km
                                </span>

                            </div>

                        </div>

                        ${
                            score !== null
                            ?
                            `
                            <div class="ai-score">

                                <span>
                                    AI Score
                                </span>

                                <strong>
                                    ${score}
                                </strong>

                            </div>
                            `
                            :
                            ""
                        }

                        <div class="recommendation-reason">

                            <p>
                                ✅ Recommended using
                                price, rating, stock
                                and distance.
                            </p>

                        </div>

                        <button
                            class="view-location-btn"
                            onclick="viewLocation(
                                ${store.latitude},
                                ${store.longitude}
                            )">

                            🗺️ View Store Location

                        </button>

                    </div>
                `;
            })

            .catch(error => {

                console.error(error);

                if (
                    error.message ===
                    "SESSION_EXPIRED"
                ) {

                    showSessionExpired(
                        recommendationResult
                    );

                    return;
                }

                recommendationResult.innerHTML = `
                    <div class="empty-state">

                        <div class="empty-icon">
                            ❌
                        </div>

                        <h3>
                            Recommendation Failed
                        </h3>

                        <p>
                            Unable to get AI recommendation.
                        </p>

                    </div>
                `;
            });
        },

        function(error) {

            console.error(error);

            recommendationResult.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ❌
                    </div>

                    <h3>
                        Location Permission Required
                    </h3>

                    <p>
                        Please allow location access
                        to get the best recommendation.
                    </p>

                </div>
            `;
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}


/* =====================================================
   ALTERNATIVE PRODUCTS
===================================================== */

function getAlternativeStores(productName) {

    const result =
        document.getElementById("productResults");

    if (!result) {
        return;
    }

    result.innerHTML += `
        <div class="empty-state">

            <div class="empty-icon">
                🔄
            </div>

            <h3>
                Finding Alternative Products...
            </h3>

            <p>
                Searching products from the same category.
            </p>

        </div>
    `;

    fetch(
        `/alternative-stores?name=${encodeURIComponent(productName)}`,
        {
            method: "GET",
            credentials: "same-origin"
        }
    )

    .then(response => {

        if (response.status === 401) {
            throw new Error(
                "SESSION_EXPIRED"
            );
        }

        if (!response.ok) {
            throw new Error(
                "Unable to find alternatives"
            );
        }

        return response.json();
    })

    .then(alternatives => {

        if (
            !Array.isArray(alternatives) ||
            alternatives.length === 0
        ) {

            result.innerHTML += `
                <div class="empty-state">

                    <div class="empty-icon">
                        ❌
                    </div>

                    <h3>
                        No Alternative Products Found
                    </h3>

                    <p>
                        Sorry, no similar products are available.
                    </p>

                </div>
            `;

            return;
        }

        let output = `

            <div class="alternative-section">

                <h2>
                    🔄 Alternative Products
                </h2>

                <p>
                    These products are available
                    in the same category.
                </p>

                <div class="alternative-container">
        `;

        alternatives.forEach(product => {

            output += `

                <div class="store-card">

                    <div class="store-icon">
                        🛒
                    </div>

                    <h3>
                        ${escapeHTML(product.product_name)}
                    </h3>

                    <p class="store-address">
                        🏪 ${escapeHTML(product.store_name)}
                    </p>

                    <p>
                        📍 ${escapeHTML(product.address)}
                    </p>

                    <div class="store-info">

                        <span>
                            💰 ₹${Number(product.price).toFixed(2)}
                        </span>

                        <span>
                            ⭐ ${product.rating}
                        </span>

                    </div>

                    <p>
                        📦 Stock:
                        ${product.quantity}
                    </p>

                    <button
                        class="view-location-btn"
                        onclick="viewLocation(
                            ${product.latitude},
                            ${product.longitude}
                        )">

                        📍 View Location

                    </button>

                </div>
            `;
        });

        output += `

                </div>

            </div>
        `;

        // Remove loading message
        const loadingMessages =
            result.querySelectorAll(
                ".empty-state"
            );

        if (loadingMessages.length > 0) {

            loadingMessages[
                loadingMessages.length - 1
            ].remove();
        }

        result.innerHTML += output;
    })

    .catch(error => {

        console.error(error);

        if (
            error.message ===
            "SESSION_EXPIRED"
        ) {

            showSessionExpired(result);

            return;
        }

        result.innerHTML += `
            <div class="empty-state">

                <div class="empty-icon">
                    ❌
                </div>

                <h3>
                    Error
                </h3>

                <p>
                    Unable to find alternative products.
                </p>

            </div>
        `;
    });
}


/* =====================================================
   GPS MAP
===================================================== */

function viewLocation(
    latitude,
    longitude
) {

    const lat =
        parseFloat(latitude);

    const lon =
        parseFloat(longitude);

    if (
        isNaN(lat) ||
        isNaN(lon)
    ) {

        alert(
            "Store location not available"
        );

        return;
    }

    const mapSection =
        document.getElementById(
            "map-section"
        );

    if (mapSection) {

        mapSection.scrollIntoView({
            behavior: "smooth"
        });
    }

    // Create map only once
    if (!map) {

        map =
            L.map("map")
            .setView(
                [lat, lon],
                15
            );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors"
            }
        ).addTo(map);
    }

    // Remove previous store marker
    if (storeMarker) {

        map.removeLayer(
            storeMarker
        );
    }

    // Add selected store marker
    storeMarker =
        L.marker([
            lat,
            lon
        ])
        .addTo(map)
        .bindPopup(
            "🏪 Selected Store"
        )
        .openPopup();

    map.setView(
        [lat, lon],
        16
    );

    // Get user location
    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(

            function(position) {

                const userLat =
                    position.coords.latitude;

                const userLon =
                    position.coords.longitude;

                if (userMarker) {

                    map.removeLayer(
                        userMarker
                    );
                }

                userMarker =
                    L.marker([
                        userLat,
                        userLon
                    ])
                    .addTo(map)
                    .bindPopup(
                        "📍 Your Current Location"
                    );

            },

            function(error) {

                console.log(
                    "Unable to get user location:",
                    error
                );
            },

            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    // Leaflet resize fix
    setTimeout(
        function() {

            if (map) {
                map.invalidateSize();
            }

        },
        300
    );
}


/* =====================================================
   STORE LOCATION PAGE SUPPORT
===================================================== */

function viewStoreLocation(
    latitude,
    longitude,
    storeName
) {

    localStorage.setItem(
        "selectedStoreLat",
        latitude
    );

    localStorage.setItem(
        "selectedStoreLon",
        longitude
    );

    localStorage.setItem(
        "selectedStoreName",
        storeName
    );

    window.location.href =
        "/map";
}


/* =====================================================
   ENTER KEY - PRODUCT SEARCH
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const productInput =
            document.getElementById(
                "productInput"
            );

        if (productInput) {

            productInput.addEventListener(
                "keypress",
                function(event) {

                    if (event.key === "Enter") {

                        event.preventDefault();

                        searchProduct();
                    }
                }
            );
        }
    }
);