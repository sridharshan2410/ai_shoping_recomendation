from flask import Flask, jsonify, request, render_template, session, redirect
from functools import wraps
import math
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from db import get_db_connection


app = Flask(__name__)

app.secret_key = "shopping_recommendation_secret_key"

CORS(app)


# =========================================================
# AUTHENTICATION DECORATORS
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

# IMPORTANT:
# Website first open pannumbodhu ALWAYS login.html varum.
# Existing session irundhaalum dashboard-ku automatic redirect
# aagathu.

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

        # Check duplicate email

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

        # Create vendor user

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

        # Create store

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

        # Check role

        if user["role"] != requested_role:

            return jsonify({
                "success": False,
                "error": (
                    f"This account is registered as "
                    f"{user['role']}"
                )
            }), 403

        # Check password

        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({
                "success": False,
                "error": "Invalid email or password"
            }), 401

        # Clear old session

        session.clear()

        # Create new session

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
# =========================================================

@app.route("/stores")
def get_stores():

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        cursor.execute(
            """
            SELECT
                store_id,
                store_name,
                latitude,
                longitude,
                address,
                rating
            FROM stores
            """
        )

        stores = cursor.fetchall()

        return jsonify(stores)

    finally:

        cursor.close()
        connection.close()


# =========================================================
# NEARBY STORES
# =========================================================

@app.route("/nearby-stores")
@login_required
@role_required("customer")
def nearby_stores():

    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not lat or not lon:

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
                store_id,
                store_name,
                latitude,
                longitude,
                address,
                rating
            FROM stores
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
                s.rating
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

        # Find category

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
                s.rating
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
# =========================================================

@app.route("/recommend")
@login_required
@role_required("customer")
def recommend():

    product_name = request.args.get("name")
    lat = request.args.get("lat")
    lon = request.args.get("lon")

    if not product_name or not lat or not lon:

        return jsonify({
            "error": "Product name and location are required"
        }), 400

    try:

        user_lat = float(lat)
        user_lon = float(lon)

    except (ValueError, TypeError):

        return jsonify({
            "error": "Invalid location"
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
                s.rating
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

        if not stores:

            return jsonify({
                "success": False,
                "message": "Product not available"
            })

        recommendations = []

        for store in stores:

            distance = calculate_distance(
                user_lat,
                user_lon,
                float(store["latitude"]),
                float(store["longitude"])
            )

            # AI-style score

            price_score = (
                float(store["price"]) * 0.40
            )

            rating_score = (
                5 - float(store["rating"])
            ) * 3

            stock_score = (
                1 / max(
                    int(store["quantity"]),
                    1
                )
            ) * 20

            distance_score = distance * 0.10

            score = (
                price_score
                + rating_score
                + stock_score
                + distance_score
            )

            store["distance"] = round(
                distance,
                2
            )

            store["score"] = round(
                score,
                2
            )

            recommendations.append(store)

        recommendations.sort(
            key=lambda x: x["score"]
        )

        best = recommendations[0]

        return jsonify({
            "success": True,
            "best_store": best,
            "recommendations": recommendations[:5]
        })

    finally:

        cursor.close()
        connection.close()


# =========================================================
# VENDOR STORE API
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
                s.rating,
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
            "error": (
                "Product name and category "
                "are required"
            )
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
            "error": (
                "Price and quantity "
                "cannot be negative"
            )
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # Get vendor store

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

        # Check existing product

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

        # Check inventory

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
            "error": (
                "Price and quantity "
                "cannot be negative"
            )
        }), 400

    connection = get_db_connection()
    cursor = connection.cursor(dictionary=True)

    try:

        # Verify ownership

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
                "error": (
                    "Product not found "
                    "in your store"
                )
            }), 404

        # Update price

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

        # Update quantity

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

        # Verify ownership

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
                "error": (
                    "Product not found "
                    "in your inventory"
                )
            }), 404

        # Delete only inventory.
        # Product table-la keep pannrom because
        # other stores also use this product.

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
            "message": (
                "Product removed "
                "from your inventory"
            )
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

    app.run(
        debug=True
    )