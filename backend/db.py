import mysql.connector

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="Srid@54445",
        database="shopping_recommendation"
    )

try:
    conn = get_db_connection()

    print("MySQL connection successful!")

    cursor = conn.cursor()

    cursor.execute("SELECT DATABASE()")

    result = cursor.fetchone()

    print("Database:", result[0])

    cursor.close()
    conn.close()

except Exception as e:
    print("Database connection failed!")
    print(e)