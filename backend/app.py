import os
from dotenv import load_dotenv

load_dotenv()
from flask import Flask, jsonify, request, render_template, session, redirect
from functools import wraps
import math

from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db_connection


app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")

if not app.secret_key:
    raise RuntimeError("SECRET_KEY missing in .env file")

# Session Security Settings
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = False  # Local HTTP development only

# =========================================================
# AUTHENTICATION
# =========================================================

def login_required(function):

    @wraps(function)
    def wrapper(*args, **kwargs):

        if "user_id" not in session:
            return jsonify({
                "error": "Please login first"
            }), 401

        return function(*args, **kwargs)

    return wrapper


def role_required(required_role):

    def decorator(function):

        @wraps(function)
        def wrapper(*args, **kwargs):

            if "user_id" not in session:
                return jsonify({
                    "error": "Please login first"
                }), 401

            if session.get("role") != required_role:
                return jsonify({
                    "error": "Access denied"
                }), 403

            return function(*args, **kwargs)

        return wrapper

    return decorator


# =========================================================
# HAVERSINE DISTANCE
# =========================================================

def calculate_distance(lat1, lon1, lat2, lon2):

    R = 6371

    lat1 = math.radians(lat1)
    lon1 = math.radians(lon1)

    lat2 = math.radians(lat2)
    lon2 = math.radians(lon2)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return R * c


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():

    return render_template("login.html")


# =========================================================
# LOGIN / REGISTER PAGES
# =========================================================

@app.route("/customer-login")
def customer_login_page():

    return render_template("customer_login.html")


@app.route("/customer-register")
def customer_register_page():

    return render_template("customer_register.html")


@app.route("/vendor-login")
def vendor_login_page():

    return render_template("vendor_login.html")


@app.route("/vendor-register")
def vendor_register_page():

    return render_template("vendor_register.html")


# =========================================================
# CUSTOMER DASHBOARD
# =========================================================

@app.route("/customer-dashboard")
@login_required
def customer_dashboard():

    if session.get("role") != "customer":
        return redirect("/vendor-dashboard")

    return render_template("index.html")


# =========================================================
# VENDOR DASHBOARD
# =========================================================

@app.route("/vendor-dashboard")
@login_required
def vendor_dashboard():

    if session.get("role") != "vendor":
        return redirect("/customer-dashboard")

    return render_template("vendor_dashboard.html")


# =========================================================
# MAP PAGE
# =========================================================

@app.route("/map")
def map_page():

    return render_template("map.html")


# =========================================================
# CUSTOMER REGISTER
# =========================================================

@app.route("/register", methods=["POST"])
def register():

    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")

    if not name or not email or not phone or not password:

        return jsonify({
            "success": False,
            "error": "All fields are required"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            return jsonify({
                "success": False,
                "error": "Email already registered"
            }), 409

        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password,
                phone,
                role
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                name,
                email,
                hashed_password,
                phone,
                "customer"
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Customer registration successful"
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR REGISTER
# =========================================================

@app.route("/register-vendor", methods=["POST"])
def register_vendor():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400

    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")

    shop_name = data.get("shop_name")
    address = data.get("address")

    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not all([
        name,
        email,
        phone,
        password,
        shop_name,
        address,
        latitude,
        longitude
    ]):

        return jsonify({
            "success": False,
            "error": "All vendor fields are required"
        }), 400

    try:

        latitude = float(latitude)
        longitude = float(longitude)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid latitude or longitude"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor()

    try:

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        existing_user = cursor.fetchone()

        if existing_user:

            return jsonify({
                "success": False,
                "error": "Email already registered"
            }), 409

        hashed_password = generate_password_hash(password)

        cursor.execute(
            """
            INSERT INTO users
            (
                name,
                email,
                password,
                phone,
                role
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                name,
                email,
                hashed_password,
                phone,
                "vendor"
            )
        )

        vendor_id = cursor.lastrowid

        cursor.execute(
            """
            INSERT INTO stores
            (
                store_name,
                latitude,
                longitude,
                address,
                rating,
                owner_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                shop_name,
                latitude,
                longitude,
                address,
                0,
                vendor_id
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Vendor registration successful"
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# LOGIN
# =========================================================

@app.route("/login", methods=["POST"])
def login():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400  
    email = data.get("email")
    password = data.get("password")
    requested_role = data.get("role")

    if not email or not password or not requested_role:

        return jsonify({
            "success": False,
            "error": "Email, password and role are required"
        }), 400

    if requested_role not in ["customer", "vendor"]:

        return jsonify({
            "success": False,
            "error": "Invalid role"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                user_id,
                name,
                email,
                password,
                phone,
                role
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        if user["role"] != requested_role:

            return jsonify({
                "success": False,
                "error": (
                    f"This account is registered as "
                    f"{user['role']}"
                )
            }), 403

        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        session.clear()

        session["user_id"] = user["user_id"]
        session["name"] = user["name"]
        session["email"] = user["email"]
        session["role"] = user["role"]

        return jsonify({
            "success": True,
            "message": "Login successful",
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": user["role"]
            }
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# CURRENT USER
# =========================================================

@app.route("/api/current-user")
@login_required
def current_user():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                user_id,
                name,
                email,
                phone,
                role
            FROM users
            WHERE user_id = %s
            """,
            (session["user_id"],)
        )

        user = cursor.fetchone()

        if not user:

            return jsonify({
                "success": False,
                "error": "User not found"
            }), 404

        return jsonify({
            "success": True,
            "user": user
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# LOGOUT
# =========================================================

@app.route("/logout")
def logout():

    session.clear()

    return jsonify({
        "success": True,
        "message": "Logged out successfully"
    })


# =========================================================
# ALL STORES
# DYNAMIC USER RATING
# =========================================================

@app.route("/stores")
def get_stores():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                s.store_id,
                s.store_name,
                s.latitude,
                s.longitude,
                s.address,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings

            FROM stores s
            """
        )

        stores = cursor.fetchall()

        return jsonify(stores)

    finally:

        cursor.close()
        connection.close()


# =========================================================
# NEARBY STORES
# DYNAMIC USER RATING
# =========================================================

@app.route("/nearby-stores")
@login_required
@role_required("customer")
def nearby_stores():

    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if lat is None or lon is None:

        return jsonify({
            "error": "Latitude and longitude are required"
        }), 400

    try:

        user_lat = float(lat)
        user_lon = float(lon)

    except (ValueError, TypeError):

        return jsonify({
            "error": "Invalid latitude or longitude"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                s.store_id,
                s.store_name,
                s.latitude,
                s.longitude,
                s.address,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings

            FROM stores s
            """
        )

        stores = cursor.fetchall()

        nearby = []

        for store in stores:

            distance = calculate_distance(
                user_lat,
                user_lon,
                float(store["latitude"]),
                float(store["longitude"])
            )

            if distance <= 20:

                store["distance"] = round(
                    distance,
                    2
                )

                nearby.append(store)

        nearby.sort(
            key=lambda x: x["distance"]
        )

        return jsonify(nearby)

    finally:

        cursor.close()
        connection.close()


# =========================================================
# PRODUCT SEARCH
# DYNAMIC USER RATING
# =========================================================

@app.route("/search-product")
@login_required
@role_required("customer")
def search_product():

    product_name = request.args.get("name")

    if not product_name:

        return jsonify({
            "error": "Product name is required"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.product_name,
                p.category,
                p.price,
                i.quantity,

                s.store_id,
                s.store_name,
                s.latitude,
                s.longitude,
                s.address,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings

            FROM products p

            JOIN inventory i
                ON p.product_id = i.product_id

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE
                p.product_name LIKE %s
                AND i.quantity > 0
            """,
            (f"%{product_name}%",)
        )

        products = cursor.fetchall()

        return jsonify(products)

    finally:

        cursor.close()
        connection.close()


# =========================================================
# ALTERNATIVE STORES
# DYNAMIC USER RATING
# =========================================================

@app.route("/alternative-stores")
@login_required
@role_required("customer")
def alternative_stores():

    product_name = request.args.get("name")

    if not product_name:

        return jsonify({
            "error": "Product name is required"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT category
            FROM products
            WHERE product_name LIKE %s
            LIMIT 1
            """,
            (f"%{product_name}%",)
        )

        product = cursor.fetchone()

        if not product:

            return jsonify([])

        category = product["category"]

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.product_name,
                p.category,
                p.price,
                i.quantity,

                s.store_id,
                s.store_name,
                s.address,
                s.latitude,
                s.longitude,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings

            FROM products p

            JOIN inventory i
                ON p.product_id = i.product_id

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE
                p.category = %s
                AND p.product_name NOT LIKE %s
                AND i.quantity > 0

            LIMIT 5
            """,
            (
                category,
                f"%{product_name}%"
            )
        )

        alternatives = cursor.fetchall()

        return jsonify(alternatives)

    finally:

        cursor.close()
        connection.close()


# =========================================================
# AI RECOMMENDATION
#
# AVAILABILITY = 35%
# DISTANCE     = 30%
# RATING       = 20%
# PRICE        = 15%
#
# FINAL SCORE = 0 TO 100
# HIGHER SCORE = BETTER RECOMMENDATION
# =========================================================

@app.route("/recommend")
@login_required
@role_required("customer")
def recommend():

    product_name = request.args.get("name")
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    # -----------------------------------------------------
    # VALIDATE INPUT
    # -----------------------------------------------------

    if not product_name or lat is None or lon is None:

        return jsonify({
            "success": False,
            "error": "Product name and location are required"
        }), 400

    try:

        user_lat = float(lat)
        user_lon = float(lon)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid location"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # -------------------------------------------------
        # GET AVAILABLE STORES
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.product_name,
                p.category,
                p.price,

                i.quantity,

                s.store_id,
                s.store_name,
                s.latitude,
                s.longitude,
                s.address,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings

            FROM products p

            JOIN inventory i
                ON p.product_id = i.product_id

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE
                p.product_name LIKE %s
                AND i.quantity > 0
            """,
            (f"%{product_name}%",)
        )

        stores = cursor.fetchall()

        # -------------------------------------------------
        # PRODUCT NOT AVAILABLE
        # -------------------------------------------------

        if not stores:

            return jsonify({
                "success": False,
                "message": "Product not available"
            })

        # -------------------------------------------------
        # CALCULATE DISTANCE
        # -------------------------------------------------

        for store in stores:

            distance = calculate_distance(
                user_lat,
                user_lon,
                float(store["latitude"]),
                float(store["longitude"])
            )

            store["distance"] = round(
                distance,
                2
            )

        # -------------------------------------------------
        # GET VALUES FOR NORMALIZATION
        # -------------------------------------------------

        prices = [
            float(store["price"])
            for store in stores
        ]

        distances = [
            float(store["distance"])
            for store in stores
        ]

        quantities = [
            int(store["quantity"])
            for store in stores
        ]

        min_price = min(prices)
        max_price = max(prices)

        min_distance = min(distances)
        max_distance = max(distances)

        min_quantity = min(quantities)
        max_quantity = max(quantities)

        # -------------------------------------------------
        # CALCULATE RECOMMENDATION
        # -------------------------------------------------

        recommendations = []

        for store in stores:

            price = float(store["price"])
            distance = float(store["distance"])
            quantity = int(store["quantity"])
            rating = float(store["rating"] or 0)

            # =============================================
            # AVAILABILITY SCORE
            # More stock = better
            # =============================================

            if quantity > 0:

                if max_quantity == min_quantity:

                    availability_score = 100

                else:

                    availability_score = (
                        (quantity - min_quantity)
                        / (max_quantity - min_quantity)
                    ) * 100

            else:

                availability_score = 0

            # =============================================
            # DISTANCE SCORE
            # Less distance = better
            # =============================================

            if max_distance == min_distance:

                distance_score = 100

            else:

                distance_score = (
                    (max_distance - distance)
                    / (max_distance - min_distance)
                ) * 100

            # =============================================
            # RATING SCORE
            # 5 STAR = 100
            # =============================================

            rating_score = (
                rating / 5
            ) * 100

            # =============================================
            # PRICE SCORE
            # Lower price = better
            # =============================================

            if max_price == min_price:

                price_score = 100

            else:

                price_score = (
                    (max_price - price)
                    / (max_price - min_price)
                ) * 100

            # =============================================
            # FINAL AI SCORE
            # =============================================

            ai_score = (
                (availability_score * 0.35)
                + (distance_score * 0.30)
                + (rating_score * 0.20)
                + (price_score * 0.15)
            )

            # =============================================
            # SAVE SCORES
            # =============================================

            store["availability_score"] = round(
                availability_score,
                2
            )

            store["distance_score"] = round(
                distance_score,
                2
            )

            store["rating_score"] = round(
                rating_score,
                2
            )

            store["price_score"] = round(
                price_score,
                2
            )

            store["score"] = round(
                ai_score,
                2
            )

            recommendations.append(store)

        # -------------------------------------------------
        # SORT
        # HIGHEST SCORE FIRST
        # -------------------------------------------------

        recommendations.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        # -------------------------------------------------
        # BEST STORE
        # -------------------------------------------------

        best = recommendations[0]

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "best_store": best,

            "recommendations": recommendations[:5],

            "weights": {
                "availability": 35,
                "distance": 30,
                "rating": 20,
                "price": 15
            }

        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# STORE RATING
# CUSTOMER SUBMIT / UPDATE RATING
# =========================================================

@app.route("/api/store-rating", methods=["POST"])
@login_required
@role_required("customer")
def store_rating():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400

    store_id = data.get("store_id")
    rating = data.get("rating")
    review = data.get("review", "")

    if store_id is None or rating is None:

        return jsonify({
            "success": False,
            "error": "Store ID and rating are required"
        }), 400

    try:

        store_id = int(store_id)
        rating = int(rating)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid store ID or rating"
        }), 400

    if rating < 1 or rating > 5:

        return jsonify({
            "success": False,
            "error": "Rating must be between 1 and 5"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # -------------------------------------------------
        # CHECK STORE
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT store_id
            FROM stores
            WHERE store_id = %s
            """,
            (store_id,)
        )

        store = cursor.fetchone()

        if not store:

            return jsonify({
                "success": False,
                "error": "Store not found"
            }), 404

        user_id = session["user_id"]

        # -------------------------------------------------
        # CHECK EXISTING RATING
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT review_id
            FROM store_reviews
            WHERE
                store_id = %s
                AND user_id = %s
            """,
            (
                store_id,
                user_id
            )
        )

        existing_review = cursor.fetchone()

        if existing_review:

            cursor.execute(
                """
                UPDATE store_reviews
                SET
                    rating = %s,
                    review = %s
                WHERE review_id = %s
                """,
                (
                    rating,
                    review,
                    existing_review["review_id"]
                )
            )

            message = "Rating updated successfully"

        else:

            cursor.execute(
                """
                INSERT INTO store_reviews
                (
                    store_id,
                    user_id,
                    rating,
                    review
                )
                VALUES (%s, %s, %s, %s)
                """,
                (
                    store_id,
                    user_id,
                    rating,
                    review
                )
            )

            message = "Rating submitted successfully"

        connection.commit()

        return jsonify({
            "success": True,
            "message": message
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# GET STORE RATING
# =========================================================

@app.route("/api/store-rating/<int:store_id>")
@login_required
def get_store_rating(store_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                COUNT(*) AS total_ratings,
                ROUND(AVG(rating), 2) AS average_rating
            FROM store_reviews
            WHERE store_id = %s
            """,
            (store_id,)
        )

        result = cursor.fetchone()

        if not result or result["total_ratings"] == 0:

            return jsonify({
                "success": True,
                "average_rating": None,
                "total_ratings": 0
            })

        return jsonify({
            "success": True,
            "average_rating": result["average_rating"],
            "total_ratings": result["total_ratings"]
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# GET STORE REVIEWS
# CUSTOMER REVIEWS DISPLAY
# =========================================================

@app.route("/api/store-reviews/<int:store_id>")
@login_required
def get_store_reviews(store_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                sr.review_id,
                sr.rating,
                sr.review,
                sr.created_at,
                u.name AS user_name
            FROM store_reviews sr
            JOIN users u
                ON sr.user_id = u.user_id
            WHERE sr.store_id = %s
            ORDER BY sr.created_at DESC
            """,
            (store_id,)
        )

        reviews = cursor.fetchall()

        return jsonify({
            "success": True,
            "reviews": reviews
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()

# =========================================================
# VENDOR STORE
# DYNAMIC RATING
# =========================================================

@app.route("/api/vendor-store")
@login_required
@role_required("vendor")
def vendor_store():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                s.store_id,
                s.store_name,
                s.latitude,
                s.longitude,
                s.address,

                COALESCE(
                    ROUND(
                        (
                            SELECT AVG(sr.rating)
                            FROM store_reviews sr
                            WHERE sr.store_id = s.store_id
                        ),
                        2
                    ),
                    0
                ) AS rating,

                (
                    SELECT COUNT(*)
                    FROM store_reviews sr2
                    WHERE sr2.store_id = s.store_id
                ) AS total_ratings,

                u.name AS owner_name

            FROM stores s

            JOIN users u
                ON s.owner_id = u.user_id

            WHERE s.owner_id = %s

            LIMIT 1
            """,
            (session["user_id"],)
        )

        store = cursor.fetchone()

        if not store:

            return jsonify({
                "success": False,
                "error": "Store not found"
            }), 404

        return jsonify({
            "success": True,
            "store": store
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR INVENTORY
# =========================================================

@app.route("/api/vendor-inventory")
@login_required
@role_required("vendor")
def vendor_inventory():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                p.product_id,
                p.product_name,
                p.category,
                p.price,
                i.quantity,
                i.last_updated,
                s.store_id

            FROM products p

            JOIN inventory i
                ON p.product_id = i.product_id

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE s.owner_id = %s

            ORDER BY p.product_name
            """,
            (session["user_id"],)
        )

        inventory = cursor.fetchall()

        return jsonify({
            "success": True,
            "inventory": inventory
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR ADD PRODUCT
# =========================================================

@app.route(
    "/api/vendor/add-product",
    methods=["POST"]
)
@login_required
@role_required("vendor")
def vendor_add_product():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400

    product_name = data.get("product_name")
    category = data.get("category")
    price = data.get("price")
    quantity = data.get("quantity")

    if not product_name or not category:

        return jsonify({
            "success": False,
            "error": "Product name and category are required"
        }), 400

    if price is None or quantity is None:

        return jsonify({
            "success": False,
            "error": "Price and quantity are required"
        }), 400

    try:

        price = float(price)
        quantity = int(quantity)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid price or quantity"
        }), 400

    if price < 0 or quantity < 0:

        return jsonify({
            "success": False,
            "error": "Price and quantity cannot be negative"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # -------------------------------------------------
        # GET VENDOR STORE
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT store_id
            FROM stores
            WHERE owner_id = %s
            LIMIT 1
            """,
            (session["user_id"],)
        )

        store = cursor.fetchone()

        if not store:

            return jsonify({
                "success": False,
                "error": "Vendor store not found"
            }), 404

        store_id = store["store_id"]

        # -------------------------------------------------
        # CHECK PRODUCT
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT product_id
            FROM products
            WHERE product_name = %s
            LIMIT 1
            """,
            (product_name,)
        )

        existing_product = cursor.fetchone()

        if existing_product:

            product_id = existing_product["product_id"]

            cursor.execute(
                """
                UPDATE products
                SET
                    category = %s,
                    price = %s
                WHERE product_id = %s
                """,
                (
                    category,
                    price,
                    product_id
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO products
                (
                    product_name,
                    category,
                    price
                )
                VALUES (%s, %s, %s)
                """,
                (
                    product_name,
                    category,
                    price
                )
            )

            product_id = cursor.lastrowid

        # -------------------------------------------------
        # CHECK INVENTORY
        # -------------------------------------------------

        cursor.execute(
            """
            SELECT inventory_id
            FROM inventory
            WHERE
                store_id = %s
                AND product_id = %s
            """,
            (
                store_id,
                product_id
            )
        )

        existing_inventory = cursor.fetchone()

        if existing_inventory:

            cursor.execute(
                """
                UPDATE inventory
                SET
                    quantity = %s,
                    last_updated = NOW()
                WHERE inventory_id = %s
                """,
                (
                    quantity,
                    existing_inventory["inventory_id"]
                )
            )

        else:

            cursor.execute(
                """
                INSERT INTO inventory
                (
                    store_id,
                    product_id,
                    quantity,
                    last_updated
                )
                VALUES (%s, %s, %s, NOW())
                """,
                (
                    store_id,
                    product_id,
                    quantity
                )
            )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Product added successfully"
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR UPDATE PRODUCT
# =========================================================

@app.route(
    "/api/vendor/update-product",
    methods=["PUT"]
)
@login_required
@role_required("vendor")
def vendor_update_product():

    data = request.get_json()

    if not data:

        return jsonify({
            "success": False,
            "error": "Invalid request"
        }), 400

    product_id = data.get("product_id")
    price = data.get("price")
    quantity = data.get("quantity")

    if product_id is None:

        return jsonify({
            "success": False,
            "error": "Product ID is required"
        }), 400

    if price is None or quantity is None:

        return jsonify({
            "success": False,
            "error": "Price and quantity are required"
        }), 400

    try:

        price = float(price)
        quantity = int(quantity)

    except (ValueError, TypeError):

        return jsonify({
            "success": False,
            "error": "Invalid price or quantity"
        }), 400

    if price < 0 or quantity < 0:

        return jsonify({
            "success": False,
            "error": "Price and quantity cannot be negative"
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                i.inventory_id,
                i.store_id

            FROM inventory i

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE
                i.product_id = %s
                AND s.owner_id = %s
            """,
            (
                product_id,
                session["user_id"]
            )
        )

        inventory = cursor.fetchone()

        if not inventory:

            return jsonify({
                "success": False,
                "error": "Product not found in your store"
            }), 404

        # -------------------------------------------------
        # UPDATE PRICE
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE products
            SET price = %s
            WHERE product_id = %s
            """,
            (
                price,
                product_id
            )
        )

        # -------------------------------------------------
        # UPDATE QUANTITY
        # -------------------------------------------------

        cursor.execute(
            """
            UPDATE inventory
            SET
                quantity = %s,
                last_updated = NOW()
            WHERE inventory_id = %s
            """,
            (
                quantity,
                inventory["inventory_id"]
            )
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully"
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR DELETE PRODUCT
# =========================================================

@app.route(
    "/api/vendor/delete-product/<int:product_id>",
    methods=["DELETE"]
)
@login_required
@role_required("vendor")
def vendor_delete_product(product_id):

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                i.inventory_id

            FROM inventory i

            JOIN stores s
                ON i.store_id = s.store_id

            WHERE
                i.product_id = %s
                AND s.owner_id = %s
            """,
            (
                product_id,
                session["user_id"]
            )
        )

        inventory = cursor.fetchone()

        if not inventory:

            return jsonify({
                "success": False,
                "error": "Product not found in your inventory"
            }), 404

        cursor.execute(
            """
            DELETE FROM inventory
            WHERE inventory_id = %s
            """,
            (inventory["inventory_id"],)
        )

        connection.commit()

        return jsonify({
            "success": True,
            "message": "Product removed from your inventory"
        })

    except Exception as e:

        connection.rollback()

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    finally:

        cursor.close()
        connection.close()


# =========================================================
# RUN FLASK SERVER
# =========================================================

if __name__ == "__main__":
    app.run(debug=False)