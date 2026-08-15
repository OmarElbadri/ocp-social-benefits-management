from flask import Blueprint, request, jsonify
from models.db import get_connection

enfants_bp = Blueprint('enfants', __name__)

# ══════════════════════════════════════
# GET ENFANTS (MATCH FRONTEND)
# ══════════════════════════════════════
@enfants_bp.route("/", methods=["GET"])
def get_enfants():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT
            en.*,
            e.nom       AS employe_nom,
            e.matricule AS employe_matricule
        FROM enfants en
        LEFT JOIN employes e ON en.employe_id = e.id
        """)

        result = cursor.fetchall()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# ADD ENFANT
# ══════════════════════════════════════
@enfants_bp.route("/", methods=["POST"])
def add_enfant():
    data = request.json

    if not data.get("nom") or not data.get("age"):
        return jsonify({"error": "Nom et âge requis"}), 400

    matricule = (data.get("matricule") or "").strip()
    if not matricule:
        return jsonify({"error": "Matricule employé (parent) requis"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, nom FROM employes WHERE matricule = %s", (matricule,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": f"Aucun employé trouvé avec le matricule « {matricule} »"}), 404

        cursor.execute("""
        INSERT INTO enfants (nom, age, genre, employe_id)
        VALUES (%s, %s, %s, %s)
        """, (data["nom"], data["age"], data.get("genre"), emp["id"]))

        conn.commit()

        return jsonify({"message": f"Enfant ajouté pour {emp['nom']}"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# UPDATE ENFANT (COMPLET)
# ══════════════════════════════════════
@enfants_bp.route("/<int:id>", methods=["PUT"])
def update_enfant(id):
    data = request.json

    if not data.get("nom") or not data.get("age"):
        return jsonify({"error": "Nom et âge requis"}), 400

    matricule = (data.get("matricule") or "").strip()
    if not matricule:
        return jsonify({"error": "Matricule employé (parent) requis"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM employes WHERE matricule = %s", (matricule,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": f"Aucun employé trouvé avec le matricule « {matricule} »"}), 404

        cursor.execute("""
        UPDATE enfants
        SET nom=%s, age=%s, genre=%s, employe_id=%s
        WHERE id=%s
        """, (data["nom"], data["age"], data.get("genre"), emp["id"], id))

        conn.commit()

        return jsonify({"message": "Enfant modifié avec succès"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# DELETE ENFANT
# ══════════════════════════════════════
@enfants_bp.route("/<int:id>", methods=["DELETE"])
def delete_enfant(id):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM enfants WHERE id=%s", (id,))
        conn.commit()

        return jsonify({"message": "Enfant supprimé"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# ENFANTS PAR EMPLOYÉ
# ══════════════════════════════════════
@enfants_bp.route("/employe/<int:employe_id>", methods=["GET"])
def get_enfants_by_employe(employe_id):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT 
            en.*,
            e.nom AS employe_nom
        FROM enfants en
        LEFT JOIN employes e ON en.employe_id = e.id
        WHERE en.employe_id = %s
        """, (employe_id,))

        result = cursor.fetchall()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()