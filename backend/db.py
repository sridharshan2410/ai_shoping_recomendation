import os
import mysql.connector
from mysql.connector import Error


def get_db_connection():
    """
    Connect to MySQL using environment variables.

    Local development:
    Configure these variables in your .env file.

    Production:
    Configure the same variables in your hosting
    provider's environment settings.
    """

    config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", "Srid@54445"),
        "database": os.getenv(
            "DB_NAME",
            "shopping_recommendation"
        ),
        "port": int(os.getenv("DB_PORT", "3306")),
        "connection_timeout": 10,
    }

    # Optional: Enable only if your hosted MySQL provider
    # requires SSL and supplies the correct SSL settings.
    ssl_ca = os.getenv("DB_SSL_CA")

    if ssl_ca:
        config["ssl_ca"] = ssl_ca
        config["ssl_verify_cert"] = True

    try:
        return mysql.connector.connect(**config)

    except Error:
        # Don't expose database credentials or internal
        # connection details to application users.
        raise


if __name__ == "__main__":
    try:
        connection = get_db_connection()

        if connection.is_connected():
            print("MySQL connection successful!")

            cursor = connection.cursor()
            cursor.execute("SELECT DATABASE()")
            result = cursor.fetchone()

            print("Database:", result[0])

            cursor.close()

        connection.close()

    except Error:
        print(
            "MySQL connection failed. "
            "Check your database configuration."
        )