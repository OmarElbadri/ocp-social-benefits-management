from flask import Blueprint, request, jsonify
from models.db import get_connection

conjoints_bp = Blueprint('conjoints', __name__)

# ══════════════════════════════════════
# GET ÉPOUSES (MATCH FRONTEND)
# ══════════════════════════════════════
@conjoints_bp.route("/", methods=["GET"])
def get_epouses():
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT
            ep.*,
            e.nom       AS employe_nom,
            e.matricule AS employe_matricule
        FROM conjoints ep
        LEFT JOIN employes e ON ep.employe_id = e.id
        ORDER BY ep.nom
        """)

        result = cursor.fetchall()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# ADD ÉPOUSE
# ══════════════════════════════════════
@conjoints_bp.route("/", methods=["POST"])
def add_epouse():
    data = request.json

    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # resolve matricule -> employe_id
        matricule = (data.get("matricule") or "").strip()
        if not matricule:
            return jsonify({"error": "Matricule employé requis"}), 400

        cursor.execute("SELECT id, nom FROM employes WHERE matricule = %s", (matricule,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": f"Aucun employé trouvé avec le matricule « {matricule} »"}), 404

        cursor.execute("""
        INSERT INTO conjoints (nom, email, employe_id, sexe)
        VALUES (%s, %s, %s, %s)
        """, (
            data["nom"],
            data.get("email"),
            emp["id"],
            data.get("sexe", "Femme")
        ))

        conn.commit()

        return jsonify({"message": f"Conjoint(e) ajouté(e) pour {emp['nom']}"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# UPDATE ÉPOUSE (COMPLET)
# ══════════════════════════════════════
@conjoints_bp.route("/<int:id>", methods=["PUT"])
def update_epouse(id):
    data = request.json

    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # resolve matricule -> employe_id
        matricule = (data.get("matricule") or "").strip()
        if not matricule:
            return jsonify({"error": "Matricule employé requis"}), 400

        cursor.execute("SELECT id FROM employes WHERE matricule = %s", (matricule,))
        emp = cursor.fetchone()
        if not emp:
            return jsonify({"error": f"Aucun employé trouvé avec le matricule « {matricule} »"}), 404

        cursor.execute("""
        UPDATE conjoints
        SET nom=%s, email=%s, employe_id=%s, sexe=%s
        WHERE id=%s
        """, (
            data["nom"],
            data.get("email"),
            emp["id"],
            data.get("sexe", "Femme"),
            id
        ))

        conn.commit()

        return jsonify({"message": "Conjoint(e) modifié(e) avec succès"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# DELETE ÉPOUSE
# ══════════════════════════════════════
@conjoints_bp.route("/<int:id>", methods=["DELETE"])
def delete_epouse(id):
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM conjoints WHERE id=%s", (id,))
        conn.commit()

        return jsonify({"message": "Épouse supprimée"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()


# ══════════════════════════════════════
# ÉPOUSES PAR EMPLOYÉ
# ══════════════════════════════════════
@conjoints_bp.route("/employe/<int:employe_id>", methods=["GET"])
def get_epouses_by_employe(employe_id):
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
        SELECT 
            ep.*,
            e.nom AS employe_nom
        FROM conjoints ep
        LEFT JOIN employes e ON ep.employe_id = e.id
        WHERE ep.employe_id = %s
        """, (employe_id,))

        result = cursor.fetchall()

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()