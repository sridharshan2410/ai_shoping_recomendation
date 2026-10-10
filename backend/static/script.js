/* =====================================================
   SHOPNEARBY AI - CUSTOMER JAVASCRIPT
   Full Version + Store Rating System
===================================================== */


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let map = null;
let userMarker = null;
let storeMarker = null;

let selectedRating = 0;
let selectedRatingStoreId = null;


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
   HELPER - SESSION EXPIRED
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

            <button
                class="view-location-btn"
                onclick="window.location.href='/customer-login'">
                🔑 Login Again
            </button>

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

    if (!locationText || !result) {
        return;
    }

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

        const rating =
            store.rating !== undefined &&
            store.rating !== null
                ? Number(store.rating).toFixed(1)
                : "No ratings";

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
                    ⭐ ${rating}
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

            <button
                class="view-location-btn"
                onclick="openStoreRating(
            ${store.store_id},
            '${escapeHTML(store.store_name)}',
            ${store.rating || 0}
            )">

            ⭐ Rate This Store

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

            getRecommendation(productName);

        }

        else {

            displayProducts([]);

            clearRecommendation();

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

        const rating =
            product.rating !== undefined &&
            product.rating !== null
                ? Number(product.rating).toFixed(1)
                : "No ratings";

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
                    ⭐ ${rating}
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
/* =====================================================
   AI TOP 3 STORE RECOMMENDATION
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
                        Finding Top 3 Stores...
                    </h3>

                    <p>
                        Comparing availability,
                        distance, rating and price.
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
                    "AI Top 3 Recommendation:",
                    data
                );


                /* =========================================
                   PRODUCT NOT AVAILABLE
                ========================================= */

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
                                ${escapeHTML(
                                    data.message
                                )}
                            </p>

                        </div>
                    `;

                    return;
                }


                /* =========================================
                   GET TOP 3 RECOMMENDATIONS
                ========================================= */

                const recommendations =
                    Array.isArray(
                        data.recommendations
                    )
                        ? data.recommendations.slice(0, 3)
                        : [];


                /* =========================================
                   NO RECOMMENDATION
                ========================================= */

                if (
                    recommendations.length === 0
                ) {

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


                /* =========================================
                   RANK ICON
                ========================================= */

                function getRankIcon(index) {

                    if (index === 0) {
                        return "🥇";
                    }

                    if (index === 1) {
                        return "🥈";
                    }

                    if (index === 2) {
                        return "🥉";
                    }

                    return "🏪";
                }


                /* =========================================
                   CREATE TOP 3 HEADER
                ========================================= */

                let output = `

                    <div class="top-recommendation-header">

                        <div class="recommendation-badge">
                            🤖 AI TOP ${recommendations.length}
                            RECOMMENDATIONS
                        </div>

                        <h2>
                            🏆 Best Stores For You
                        </h2>

                        <p>
                            Stores ranked using
                            availability, distance,
                            rating and price.
                        </p>

                    </div>

                `;


                /* =========================================
                   CREATE EACH RECOMMENDATION CARD
                ========================================= */

                recommendations.forEach(
                    (store, index) => {

                        const distance =
                            store.distance !== undefined
                                ? Number(
                                    store.distance
                                ).toFixed(2)
                                : "N/A";


                        const price =
                            store.price !== undefined
                                ? Number(
                                    store.price
                                ).toFixed(2)
                                : "N/A";


                        const quantity =
                            store.quantity !== undefined
                                ? Number(
                                    store.quantity
                                )
                                : 0;


                        const rating =
                            store.rating !== undefined &&
                            store.rating !== null
                                ? Number(
                                    store.rating
                                ).toFixed(1)
                                : "No ratings";


                        /* =================================
                           AI SCORE VALUES
                        ================================= */

                        const availabilityScore =
                            store.availability_score !== undefined
                                ? Number(
                                    store.availability_score
                                ).toFixed(1)
                                : "0.0";


                        const distanceScore =
                            store.distance_score !== undefined
                                ? Number(
                                    store.distance_score
                                ).toFixed(1)
                                : "0.0";


                        const ratingScore =
                            store.rating_score !== undefined
                                ? Number(
                                    store.rating_score
                                ).toFixed(1)
                                : "0.0";


                        const priceScore =
                            store.price_score !== undefined
                                ? Number(
                                    store.price_score
                                ).toFixed(1)
                                : "0.0";


                        const score =
                            store.score !== undefined
                                ? Number(
                                    store.score
                                ).toFixed(2)
                                : "N/A";


                        /* =================================
                           AI EXPLANATION
                        ================================= */

                        let reasons = [];


                        if (quantity > 0) {

                            reasons.push(
                                "Product is currently available"
                            );
                        }


                        if (
                            store.rating !== undefined &&
                            Number(store.rating) >= 4
                        ) {

                            reasons.push(
                                "Good customer rating"
                            );
                        }


                        if (
                            store.distance !== undefined &&
                            Number(store.distance) <= 2
                        ) {

                            reasons.push(
                                "Very close to your location"
                            );
                        }


                        if (
                            store.price !== undefined
                        ) {

                            reasons.push(
                                "Competitive product price"
                            );
                        }


                        if (reasons.length === 0) {

                            reasons.push(
                                "Best overall combination of available factors"
                            );
                        }


                        /* =================================
                           RECOMMENDATION CARD
                        ================================= */

                        output += `

                            <div class="recommendation-card">

                                <!-- RANK -->

                                <div class="recommendation-rank">

                                    ${getRankIcon(index)}

                                    <strong>
                                        #${index + 1}
                                    </strong>

                                </div>


                                <!-- AI BADGE -->

                                <div class="recommendation-badge">

                                    ${
                                        index === 0
                                            ? "🤖 AI Recommended"
                                            : "🤖 AI Recommendation"
                                    }

                                </div>


                                <!-- STORE HEADER -->

                                <div class="recommendation-header">

                                    <div class="recommendation-icon">
                                        🛒
                                    </div>

                                    <div>

                                        <h3>
                                            ${escapeHTML(
                                                store.store_name
                                            )}
                                        </h3>

                                        <p>
                                            📍 ${escapeHTML(
                                                store.address
                                            )}
                                        </p>

                                    </div>

                                </div>


                                <!-- PRODUCT INFORMATION -->

                                <div class="recommendation-product">

                                    <h4>
                                        ${escapeHTML(
                                            store.product_name
                                        )}
                                    </h4>

                                    <div class="recommendation-details">

                                        <span>
                                            💰 ₹${price}
                                        </span>

                                        <span>
                                            ⭐ ${rating}
                                        </span>

                                        <span>
                                            📦 ${quantity} available
                                        </span>

                                        <span>
                                            📏 ${distance} km
                                        </span>

                                    </div>

                                </div>


                                <!-- AI SCORE -->

                                <div class="ai-score">

                                    <span>
                                        🤖 AI Score
                                    </span>

                                    <strong>
                                        ${score}
                                    </strong>

                                </div>


                                <!-- SCORE BREAKDOWN -->

                                <div class="recommendation-analysis">

                                    <h4>
                                        📊 Recommendation Analysis
                                    </h4>


                                    <div class="analysis-row">

                                        <span>
                                            📦 Availability
                                            <small>
                                                (35%)
                                            </small>
                                        </span>

                                        <strong>
                                            ${availabilityScore}%
                                        </strong>

                                    </div>


                                    <div class="analysis-row">

                                        <span>
                                            📏 Distance
                                            <small>
                                                (30%)
                                            </small>
                                        </span>

                                        <strong>
                                            ${distanceScore}%
                                        </strong>

                                    </div>


                                    <div class="analysis-row">

                                        <span>
                                            ⭐ Rating
                                            <small>
                                                (20%)
                                            </small>
                                        </span>

                                        <strong>
                                            ${ratingScore}%
                                        </strong>

                                    </div>


                                    <div class="analysis-row">

                                        <span>
                                            💰 Price
                                            <small>
                                                (15%)
                                            </small>
                                        </span>

                                        <strong>
                                            ${priceScore}%
                                        </strong>

                                    </div>

                                </div>


                                <!-- WHY THIS STORE -->

                                <div class="recommendation-reason">

                                    <h4>
                                        💡 Why this store?
                                    </h4>

                                    <ul>

                                        ${reasons.map(
                                            reason => `
                                                <li>
                                                    ✅ ${escapeHTML(
                                                        reason
                                                    )}
                                                </li>
                                            `
                                        ).join("")}

                                    </ul>

                                </div>


                                <!-- LOCATION BUTTON -->

                                <button
                                    class="view-location-btn"
                                    onclick="viewLocation(
                                        ${store.latitude},
                                        ${store.longitude}
                                    )">

                                    🗺️ View Store Location

                                </button>


                                <!-- RATING BUTTON -->

                                <button
                                    class="view-location-btn"
                                    onclick="openStoreRating(
                                        ${store.store_id},
                                        '${escapeHTML(
                                            store.store_name
                                        )}',
                                        ${store.rating || 0}
                                    )">

                                    ⭐ Rate This Store

                                </button>

                            </div>

                        `;
                    }
                );


                /* =========================================
                   DISPLAY ALL TOP 3
                ========================================= */

                recommendationResult.innerHTML =
                    output;

            })
            .catch(error => {

                console.error(
                    error
                );


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

            console.error(
                error
            );

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
        <div
            id="alternativeLoading"
            class="empty-state">

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

        const loading =
            document.getElementById(
                "alternativeLoading"
            );

        if (loading) {
            loading.remove();
        }

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

            const rating =
                product.rating !== undefined &&
                product.rating !== null
                    ? Number(product.rating).toFixed(1)
                    : "No ratings";

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
                            ⭐ ${rating}
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

        result.innerHTML += output;
    })
    .catch(error => {

        console.error(error);

        const loading =
            document.getElementById(
                "alternativeLoading"
            );

        if (loading) {
            loading.remove();
        }

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
   STORE RATING SYSTEM
===================================================== */

function openStoreRating(
    storeId,
    storeName,
    currentRating = 0
) {

    const section =
        document.getElementById(
            "store-rating-section"
        );

    const storeIdInput =
        document.getElementById(
            "ratingStoreId"
        );

    const storeNameElement =
        document.getElementById(
            "ratingStoreName"
        );

    const ratingMessage =
        document.getElementById(
            "ratingMessage"
        );

    if (
        !section ||
        !storeIdInput ||
        !storeNameElement
    ) {

        console.error(
            "Rating section elements not found"
        );

        return;
    }

    selectedRating = 0;
    selectedRatingStoreId = Number(storeId);

    storeIdInput.value = storeId;

    storeNameElement.textContent =
        `⭐ Rate ${storeName}`;

    if (ratingMessage) {
        ratingMessage.textContent = "";
    }

    const review =
        document.getElementById(
            "storeReview"
        );

    if (review) {
        review.value = "";
    }

    updateRatingStars();

    loadStoreRating(storeId);

    section.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


/* =====================================================
   SELECT STAR RATING
===================================================== */

function selectRating(rating) {

    rating = Number(rating);

    if (
        rating < 1 ||
        rating > 5
    ) {
        return;
    }

    selectedRating = rating;

    updateRatingStars();

    const selectedRatingText =
        document.getElementById(
            "selectedRating"
        );

    if (selectedRatingText) {

        selectedRatingText.textContent =
            `You selected ${rating} / 5 ⭐`;
    }
}


/* =====================================================
   UPDATE STAR UI
===================================================== */

function updateRatingStars() {

    const starContainer =
        document.getElementById(
            "starRating"
        );

    if (!starContainer) {
        return;
    }

    const stars =
        starContainer.querySelectorAll(
            "button"
        );

    stars.forEach(
        (star, index) => {

            const value =
                index + 1;

            star.classList.toggle(
                "selected",
                value <= selectedRating
            );

            star.setAttribute(
                "aria-label",
                `${value} star${value > 1 ? "s" : ""}`
            );
        }
    );

    const selectedRatingText =
        document.getElementById(
            "selectedRating"
        );

    if (selectedRatingText) {

        selectedRatingText.textContent =
            selectedRating > 0
                ? `You selected ${selectedRating} / 5 ⭐`
                : "No rating selected";
    }
}


/* =====================================================
   LOAD STORE AVERAGE RATING
===================================================== */

async function loadStoreRating(storeId) {

    try {

        // =====================================================
        // LOAD AVERAGE STORE RATING
        // =====================================================

        const ratingResponse = await fetch(
            `/api/store-rating/${storeId}`
        );

        const ratingData = await ratingResponse.json();

        const currentRating =
            document.getElementById("currentStoreRating");

        if (currentRating) {

            if (
                ratingData.success &&
                ratingData.total_ratings > 0
            ) {

                currentRating.innerHTML = `
                    ⭐ <strong>${ratingData.average_rating}</strong>
                    / 5
                    <span>
                        (${ratingData.total_ratings} ratings)
                    </span>
                `;

            } else {

                currentRating.innerHTML = `
                    ⭐ No ratings yet
                `;
            }
        }


        // =====================================================
        // LOAD INDIVIDUAL CUSTOMER REVIEWS
        // =====================================================

        const reviewResponse = await fetch(
            `/api/store-reviews/${storeId}`
        );

        const reviewData = await reviewResponse.json();

        const reviewsContainer =
            document.getElementById("storeReviews");


        // Container not found
        if (!reviewsContainer) {
            return;
        }


        // =====================================================
        // NO REVIEWS
        // =====================================================

        if (
            !reviewData.success ||
            !Array.isArray(reviewData.reviews) ||
            reviewData.reviews.length === 0
        ) {

            reviewsContainer.innerHTML = `
                <div class="no-reviews">
                    <div class="no-reviews-icon">
                        💬
                    </div>

                    <h3>No Reviews Yet</h3>

                    <p>
                        Be the first customer to review this store!
                    </p>
                </div>
            `;

            return;
        }


        // =====================================================
        // DISPLAY REVIEWS
        // =====================================================

        reviewsContainer.innerHTML = `
            
            <div class="reviews-title">
                <h3>💬 Customer Reviews</h3>

                <span>
                    ${reviewData.reviews.length}
                    review${reviewData.reviews.length > 1 ? "s" : ""}
                </span>
            </div>

            <div class="reviews-list">

                ${reviewData.reviews.map(review => {

                    const rating =
                        Number(review.rating) || 0;

                    const stars =
                        "⭐".repeat(rating);

                    const userName =
                        escapeHTML(
                            review.user_name || "Customer"
                        );

                    const reviewText =
                        escapeHTML(
                            review.review || "No comment provided"
                        );

                    const reviewDate =
                        review.created_at
                            ? escapeHTML(
                                String(review.created_at)
                              )
                            : "";

                    return `
                        
                        <div class="review-card">

                            <div class="review-header">

                                <div class="review-user">

                                    <div class="review-avatar">
                                        👤
                                    </div>

                                    <div>
                                        <strong>
                                            ${userName}
                                        </strong>

                                        ${
                                            reviewDate
                                                ? `
                                                    <small>
                                                        ${reviewDate}
                                                    </small>
                                                  `
                                                : ""
                                        }
                                    </div>

                                </div>


                                <div class="review-stars">
                                    ${stars}
                                </div>

                            </div>


                            <div class="review-content">

                                <p>
                                    ${reviewText}
                                </p>

                            </div>

                        </div>

                    `;

                }).join("")}

            </div>
        `;


    } catch (error) {

        console.error(
            "Error loading store rating/reviews:",
            error
        );

        const reviewsContainer =
            document.getElementById("storeReviews");

        if (reviewsContainer) {

            reviewsContainer.innerHTML = `
                <div class="no-reviews">
                    <p>
                        ⚠️ Unable to load reviews.
                    </p>
                </div>
            `;
        }
    }
}
/* =====================================================
   SUBMIT STORE RATING
===================================================== */

function submitStoreRating() {

    const storeIdInput =
        document.getElementById(
            "ratingStoreId"
        );

    const reviewInput =
        document.getElementById(
            "storeReview"
        );

    const ratingMessage =
        document.getElementById(
            "ratingMessage"
        );

    if (
        !storeIdInput ||
        !reviewInput ||
        !ratingMessage
    ) {

        console.error(
            "Rating form elements not found"
        );

        return;
    }

    const storeId =
        Number(storeIdInput.value);

    const review =
        reviewInput.value.trim();

    if (!storeId) {

        ratingMessage.textContent =
            "❌ Please select a store first.";

        return;
    }

    if (
        selectedRating < 1 ||
        selectedRating > 5
    ) {

        ratingMessage.textContent =
            "⚠️ Please select a rating from 1 to 5 stars.";

        return;
    }

    ratingMessage.textContent =
        "⏳ Submitting your rating...";

    fetch(
        "/api/store-rating",
        {
            method: "POST",
            credentials: "same-origin",

            headers: {
                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                store_id: storeId,
                rating: selectedRating,
                review: review
            })
        }
    )
    .then(response => {

        if (response.status === 401) {
            throw new Error(
                "SESSION_EXPIRED"
            );
        }

        return response.json()
            .then(data => ({
                ok: response.ok,
                data: data
            }));
    })
    .then(({ ok, data }) => {

        if (
            !ok ||
            !data.success
        ) {

            throw new Error(
                data.error ||
                data.message ||
                "Unable to submit rating"
            );
        }

        ratingMessage.textContent =
            "✅ Your rating was submitted successfully!";

        loadStoreRating(storeId);

        /*
           Reset selected rating
           after successful submission.
        */

        selectedRating = 0;

        updateRatingStars();

        reviewInput.value = "";
    })
    .catch(error => {

        console.error(
            "Rating submit error:",
            error
        );

        if (
            error.message ===
            "SESSION_EXPIRED"
        ) {

            window.location.href =
                "/customer-login";

            return;
        }

        ratingMessage.textContent =
            `❌ ${error.message}`;
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

    /*
       Create map only once.
    */

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

    /*
       Remove previous store marker.
    */

    if (storeMarker) {

        map.removeLayer(
            storeMarker
        );
    }

    /*
       Add selected store marker.
    */

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

    /*
       Get user current location.
    */

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

    /*
       Leaflet resize fix.
    */

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

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        searchProduct();
                    }
                }
            );
        }

        /*
           Make sure rating stars
           have correct initial state.
        */

        updateRatingStars();
    }
);