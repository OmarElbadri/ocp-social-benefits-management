from flask import Blueprint, request, jsonify
from models.db import get_connection

encadrants_bp = Blueprint('encadrants', __name__)


# ── Liste encadrants ───────────────────────────────────────
@encadrants_bp.route("/", methods=["GET"])
def get_encadrants():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT e.*,
               COUNT(DISTINCT g.id)  AS nb_groupes,
               COUNT(DISTINCT pc.id) AS nb_enfants
        FROM encadrants e
        LEFT JOIN groupes_camp g  ON g.encadrant_id = e.id
        LEFT JOIN participation_camp pc ON pc.groupe_id = g.id
        GROUP BY e.id
        ORDER BY e.nom
        """)
        return jsonify(cursor.fetchall())
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Créer encadrant ────────────────────────────────────────
@encadrants_bp.route("/", methods=["POST"])
def add_encadrant():
    data = request.json
    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO encadrants (nom, sexe, age, specialite, telephone, email)
        VALUES (%s, %s, %s, %s, %s, %s)
        """, (data["nom"], data.get("sexe"), data.get("age") or None,
              data.get("specialite"), data.get("telephone"), data.get("email")))
        conn.commit()
        return jsonify({"message": "Encadrant ajouté"})
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Modifier encadrant ─────────────────────────────────────
@encadrants_bp.route("/<int:id>", methods=["PUT"])
def update_encadrant(id):
    data = request.json
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE encadrants
        SET nom=%s, sexe=%s, age=%s, specialite=%s, telephone=%s, email=%s
        WHERE id=%s
        """, (data.get("nom"), data.get("sexe"), data.get("age") or None,
              data.get("specialite"), data.get("telephone"), data.get("email"), id))
        conn.commit()
        return jsonify({"message": "Encadrant modifié"})
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Supprimer encadrant ────────────────────────────────────
@encadrants_bp.route("/<int:id>", methods=["DELETE"])
def delete_encadrant(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM encadrants WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Encadrant supprimé"})
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Groupes supervisés par un encadrant (+ enfants) ───────
@encadrants_bp.route("/<int:id>/groupes", methods=["GET"])
def get_groupes_encadrant(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT g.id, g.nom AS groupe_nom, g.genre, g.age_min, g.age_max,
               g.capacite, c.id AS camp_id, c.nom AS camp_nom, c.ville AS camp_ville,
               COUNT(pc.id) AS nb_membres
        FROM groupes_camp g
        JOIN camps c ON g.camp_id = c.id
        LEFT JOIN participation_camp pc ON pc.groupe_id = g.id
        WHERE g.encadrant_id = %s
        GROUP BY g.id
        ORDER BY c.nom, g.age_min
        """, (id,))
        groupes = cursor.fetchall()

        for g in groupes:
            cursor.execute("""
            SELECT pc.id, en.nom, en.age, en.genre, em.nom AS employe_nom
            FROM participation_camp pc
            JOIN enfants en ON pc.enfant_id = en.id
            LEFT JOIN employes em ON en.employe_id = em.id
            WHERE pc.groupe_id = %s
            ORDER BY en.nom
            """, (g['id'],))
            g['membres'] = cursor.fetchall()

        return jsonify(groupes)
    except Exception as ex:
        return jsonify({"error": str(ex)}), 500
    finally:
        cursor.close()
        conn.close()
