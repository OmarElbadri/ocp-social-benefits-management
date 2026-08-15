from flask import Blueprint, request, jsonify
from models.db import get_connection
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()


# REGISTER
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json

    hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO users (nom, email, password, role)
    VALUES (%s, %s, %s, %s)
    """, (
        data["nom"],
        data["email"],
        hashed,
        data.get("role", "agent")
    ))

    conn.commit()

    return jsonify({"message": "User created"})


# LOGIN
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
    user = cursor.fetchone()

    if user and bcrypt.check_password_hash(user["password"], password):
        access_token = create_access_token(identity={
            "id": user["id"],
            "role": user["role"]
        })
        return jsonify({
            "access_token": access_token,
            "user": {
                "id": user["id"],
                "nom": user["nom"],
                "role": user["role"]
            }
        }), 200

    return jsonify({"error": "Invalid credentials"}), 401

    # GET USERS (IMPORTANT POUR FRONTEND)
@auth_bp.route("/users", methods=["GET"])
def get_users():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, nom, email, role FROM users")
        users = cursor.fetchall()

        return jsonify(users)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# UPDATE USER
@auth_bp.route("/<int:id>", methods=["PUT"])
def update_user(id):
    data = request.json
    conn = get_connection()
    cursor = conn.cursor()
    try:
        if data.get("password"):
            hashed = bcrypt.generate_password_hash(data["password"]).decode("utf-8")
            cursor.execute(
                "UPDATE users SET nom=%s, email=%s, password=%s, role=%s WHERE id=%s",
                (data.get("nom"), data.get("email"), hashed, data.get("role", "agent"), id)
            )
        else:
            cursor.execute(
                "UPDATE users SET nom=%s, email=%s, role=%s WHERE id=%s",
                (data.get("nom"), data.get("email"), data.get("role", "agent"), id)
            )
        conn.commit()
        return jsonify({"message": "Utilisateur modifié"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# DELETE USER
@auth_bp.route("/<int:id>", methods=["DELETE"])
def delete_user(id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Utilisateur supprimé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()