from flask import Flask, jsonify, request, render_template
import math
from flask_cors import CORS
from db import get_db_connection

app = Flask(__name__)
CORS(app)


def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in KM

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    dlat = lat2 - lat1
    dlon = math.radians(lon2 - lon1)

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


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/stores")
def get_stores():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM stores")
    stores = cursor.fetchall()

    cursor.close()
    conn.close()

    return jsonify(stores)


@app.route("/nearby-stores")
def nearby_stores():

    user_lat = request.args.get("lat")
    user_lon = request.args.get("lon")

    if not user_lat or not user_lon:
        return jsonify({
            "error": "Latitude and longitude are required"
        }), 400

    user_lat = float(user_lat)
    user_lon = float(user_lon)

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM stores")
    stores = cursor.fetchall()

    cursor.close()
    conn.close()

    nearby = []

    for store in stores:

        distance = calculate_distance(
            user_lat,
            user_lon,
            float(store["latitude"]),
            float(store["longitude"])
        )

        if distance <= 20:
            store["distance_km"] = round(distance, 2)
            nearby.append(store)

    return jsonify(nearby)


if __name__ == "__main__":
    app.run(debug=True)