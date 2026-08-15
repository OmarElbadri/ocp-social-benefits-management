import os
import mysql.connector
from mysql.connector import Error, pooling
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.environ.get("DB_HOST"),
    "user": os.environ.get("DB_USER"),
    "password": os.environ.get("DB_PASSWORD"),
    "database": os.environ.get("DB_NAME")
}

_pool = None

def _get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="ocp_pool",
            pool_size=10,
            pool_reset_session=True,
            connection_timeout=3,
            **DB_CONFIG
        )
    return _pool

def get_connection():
    try:
        return _get_pool().get_connection()
    except Error as e:
        print(f"Erreur connexion MySQL: {e}")
        return None