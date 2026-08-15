from flask import Blueprint, request, jsonify
from models.db import get_connection

employes_bp = Blueprint("employes", __name__)


# GET ALL
@employes_bp.route("/", methods=["GET"])
def get_employes():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
        SELECT
            e.*,
            COUNT(DISTINCT ep.id) AS nb_epouses,
            COUNT(DISTINCT en.id) AS nb_enfants
        FROM employes e
        LEFT JOIN conjoints ep ON ep.employe_id = e.id
        LEFT JOIN enfants en ON en.employe_id = e.id
        GROUP BY e.id
        """)
        result = cursor.fetchall()
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# NEXT MATRICULE
@employes_bp.route("/next-matricule", methods=["GET"])
def next_matricule():
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # base on total count so it always increments beyond existing rows
        cursor.execute("SELECT COUNT(*) FROM employes")
        count = cursor.fetchone()[0]
        num = count + 1
        return jsonify({"matricule": f"OCP-{num:03d}"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ADD
@employes_bp.route("/", methods=["POST"])
def add_employe():
    data = request.json
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO employes (nom, email, matricule, poste, sexe)
        VALUES (%s, %s, %s, %s, %s)
        """, (data["nom"], data.get("email"), data.get("matricule"), data.get("poste"), data.get("sexe", "Homme")))
        conn.commit()
        return jsonify({"message": "Employé ajouté"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# DELETE
@employes_bp.route("/<int:id>", methods=["DELETE"])
def delete_employe(id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM employes WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Employé supprimé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# UPDATE
@employes_bp.route("/<int:id>", methods=["PUT"])
def update_employe(id):
    data = request.json
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE employes
        SET nom=%s, email=%s, matricule=%s, poste=%s, sexe=%s
        WHERE id=%s
        """, (data["nom"], data.get("email"), data.get("matricule"), data.get("poste"), data.get("sexe", "Homme"), id))
        conn.commit()
        return jsonify({"message": "Employé modifié"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
