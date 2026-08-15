from flask import Blueprint, request, jsonify
from models.db import get_connection

excursions_bp = Blueprint('excursions', __name__)


# ── Liste des excursions ───────────────────────────────────
@excursions_bp.route("/", methods=["GET"])
def get_excursions():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT ex.*, COUNT(p.id) AS nb_inscrits
        FROM excursions ex
        LEFT JOIN participation p ON p.excursion_id = ex.id
        GROUP BY ex.id
        """)
        rows = cursor.fetchall()
        for r in rows:
            if r.get('date'):
                r['date'] = str(r['date'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Créer une excursion ────────────────────────────────────
@excursions_bp.route("/", methods=["POST"])
def add_excursion():
    data = request.json
    if not data.get("ville") or not data.get("date") or not data.get("capacite"):
        return jsonify({"error": "ville, date et capacite requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO excursions (ville, date, capacite, type, heure_depart, heure_retour, age_min_enfant, age_max_enfant)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (data["ville"], data["date"], data["capacite"], data.get("type"),
              data.get("heure_depart") or None, data.get("heure_retour") or None,
              data.get("age_min_enfant") or None, data.get("age_max_enfant") or None))
        conn.commit()
        return jsonify({"message": "Excursion ajoutée avec succès"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Modifier une excursion ─────────────────────────────────
@excursions_bp.route("/<int:id>", methods=["PUT"])
def update_excursion(id):
    data = request.json
    if not data.get("ville") or not data.get("date"):
        return jsonify({"error": "ville et date requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE excursions SET ville=%s, date=%s, capacite=%s, type=%s,
               heure_depart=%s, heure_retour=%s, age_min_enfant=%s, age_max_enfant=%s
        WHERE id=%s
        """, (data["ville"], data["date"], data.get("capacite"), data.get("type"),
              data.get("heure_depart") or None, data.get("heure_retour") or None,
              data.get("age_min_enfant") or None, data.get("age_max_enfant") or None, id))
        conn.commit()
        return jsonify({"message": "Excursion modifiée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Supprimer une excursion ────────────────────────────────
@excursions_bp.route("/<int:id>", methods=["DELETE"])
def delete_excursion(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM excursions WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Excursion supprimée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Inscrire un participant ────────────────────────────────
@excursions_bp.route("/<int:id>/inscrire", methods=["POST"])
def inscrire_excursion(id):
    data = request.json
    type_p = data.get("type")
    personne_id = data.get("personne_id")

    col_map = {"employe": "employe_id", "enfant": "enfant_id", "epouse": "epouse_id"}
    col = col_map.get(type_p)
    if not col:
        return jsonify({"error": "Type de participant invalide"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Récupérer les infos de l'excursion
        cursor.execute(
            "SELECT ville, type, capacite, date, age_min_enfant, age_max_enfant FROM excursions WHERE id=%s", (id,))
        excursion = cursor.fetchone()
        if not excursion:
            return jsonify({"error": "Excursion introuvable"}), 404

        exc_type    = (excursion['type'] or '').strip()
        exc_nom     = excursion['ville']
        exc_date    = excursion['date']
        age_min_exc = excursion['age_min_enfant']
        age_max_exc = excursion['age_max_enfant']

        # Validation compatibilité type participant / type excursion
        type_labels = {
            'employe': 'les employés',
            'epouse':  'les épouses/conjoints',
            'enfant':  'les enfants'
        }

        # Enfants uniquement → seulement les enfants
        if exc_type == 'Enfants' and type_p != 'enfant':
            return jsonify({"error":
                f"L'excursion « {exc_nom} » est réservée aux enfants uniquement. "
                f"L'inscription de {type_labels.get(type_p, type_p)} n'est pas autorisée "
                "pour ce type de voyage."}), 409

        # Employé + Conjoint(e) / Célibataires → pas d'enfants
        if exc_type == 'Employe_Conjoint' and type_p == 'enfant':
            return jsonify({"error":
                f"L'excursion « {exc_nom} » est réservée aux employés et conjoint(e)s / célibataires. "
                "L'inscription des enfants n'est pas autorisée pour ce type de voyage."}), 409

        # Vérification de l'âge des enfants si des limites sont définies
        if type_p == 'enfant' and (age_min_exc is not None or age_max_exc is not None):
            cursor.execute("SELECT age FROM enfants WHERE id=%s", (personne_id,))
            enfant_row = cursor.fetchone()
            if enfant_row:
                age_enfant = enfant_row['age']
                if age_min_exc is not None and age_enfant < age_min_exc:
                    return jsonify({"error":
                        f"Cet enfant a {age_enfant} ans et ne remplit pas la condition d'âge minimum "
                        f"({age_min_exc} ans) pour l'excursion « {exc_nom} »."}), 409
                if age_max_exc is not None and age_enfant > age_max_exc:
                    return jsonify({"error":
                        f"Cet enfant a {age_enfant} ans et dépasse l'âge maximum autorisé "
                        f"({age_max_exc} ans) pour l'excursion « {exc_nom} »."}), 409

        # Famille → employé doit avoir un conjoint enregistré
        if exc_type == 'Famille' and type_p == 'employe':
            cursor.execute(
                "SELECT COUNT(*) AS nb FROM conjoints WHERE employe_id = %s", (personne_id,))
            has_conjoint = cursor.fetchone()['nb'] > 0
            if not has_conjoint:
                return jsonify({"error":
                    "Cet employé n'a pas de conjoint(e) enregistré(e). "
                    "Les excursions Famille sont réservées aux employés mariés avec famille. "
                    "Pour un employé célibataire, utilisez le type « Employé + Conjoint(e) / Célibataires »."}), 409

        # Vérifier la capacité de l'excursion
        cursor.execute(
            "SELECT COUNT(*) AS nb FROM participation WHERE excursion_id=%s", (id,))
        nb_inscrits = cursor.fetchone()['nb']
        capacite = excursion['capacite']
        if capacite and nb_inscrits >= capacite:
            return jsonify({"error":
                f"L'excursion « {exc_nom} » est complète "
                f"({nb_inscrits}/{capacite} places utilisées). "
                "Inscription impossible."}), 409

        # Vérifier inscription en double dans cette même excursion
        cursor.execute(
            f"SELECT id FROM participation WHERE excursion_id=%s AND {col}=%s",
            (id, personne_id))
        if cursor.fetchone():
            return jsonify({"error":
                "Cette personne est déjà inscrite à cette excursion"}), 409

        # Règle métier : pas deux excursions le même jour pour la même personne
        if exc_date:
            cursor.execute(f"""
                SELECT e2.ville, e2.date
                FROM participation p2
                JOIN excursions e2 ON p2.excursion_id = e2.id
                WHERE p2.{col} = %s
                  AND e2.date = %s
                  AND p2.excursion_id != %s
            """, (personne_id, exc_date, id))
            conflit = cursor.fetchone()
            if conflit:
                date_fmt = str(conflit['date'])[:10] if conflit['date'] else str(exc_date)
                return jsonify({"error":
                    f"Cette personne est déjà inscrite à l'excursion "
                    f"« {conflit['ville']} » le {date_fmt}. "
                    "Il est impossible de participer à deux excursions le même jour."}), 409

        # Inscrire
        cursor.execute(
            f"INSERT INTO participation (excursion_id, {col}, type_participant) "
            "VALUES (%s, %s, %s)",
            (id, personne_id, type_p)
        )
        conn.commit()
        places_restantes = (capacite - nb_inscrits - 1) if capacite else None
        msg = "Inscription réussie"
        if places_restantes is not None:
            msg += (f" — {places_restantes} "
                    f"place{'s' if places_restantes > 1 else ''} "
                    f"restante{'s' if places_restantes > 1 else ''}")
        return jsonify({"message": msg})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Participants d'une excursion ───────────────────────────
@excursions_bp.route("/<int:id>/participants", methods=["GET"])
def get_participants_excursion(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT
            p.id,
            p.type_participant AS type,
            CASE
                WHEN p.employe_id IS NOT NULL THEN e.nom
                WHEN p.enfant_id  IS NOT NULL THEN en.nom
                WHEN p.epouse_id  IS NOT NULL THEN ep.nom
            END AS nom,
            CASE
                WHEN p.employe_id IS NOT NULL THEN e.poste
                WHEN p.enfant_id  IS NOT NULL THEN CONCAT(en.age, ' ans')
                WHEN p.epouse_id  IS NOT NULL THEN ep.email
            END AS detail,
            CASE
                WHEN p.enfant_id IS NOT NULL THEN en.age
                ELSE NULL
            END AS age,
            CASE
                WHEN p.enfant_id IS NOT NULL THEN en.genre
                ELSE NULL
            END AS genre,
            CASE
                WHEN p.employe_id IS NOT NULL THEN e.sexe
                WHEN p.epouse_id  IS NOT NULL THEN ep.sexe
                ELSE NULL
            END AS sexe
        FROM participation p
        LEFT JOIN employes  e  ON p.employe_id = e.id
        LEFT JOIN enfants   en ON p.enfant_id  = en.id
        LEFT JOIN conjoints ep ON p.epouse_id  = ep.id
        WHERE p.excursion_id = %s
        ORDER BY p.type_participant, en.age
        """, (id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Retirer un participant ─────────────────────────────────
@excursions_bp.route("/<int:id>/participants/<int:pid>", methods=["DELETE"])
def remove_participant_excursion(id, pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM participation WHERE id=%s AND excursion_id=%s", (pid, id))
        conn.commit()
        return jsonify({"message": "Participant retiré"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Programme d'une excursion ──────────────────────────────
@excursions_bp.route("/<int:id>/programme", methods=["GET"])
def get_programme_excursion(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT id, heure, activite, description
        FROM programme_excursion WHERE excursion_id=%s ORDER BY heure
        """, (id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@excursions_bp.route("/<int:id>/programme", methods=["POST"])
def add_programme_excursion(id):
    data = request.json
    if not data.get("activite"):
        return jsonify({"error": "Activité requise"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO programme_excursion (excursion_id, heure, activite, description)
        VALUES (%s, %s, %s, %s)
        """, (id, data.get("heure"), data["activite"], data.get("description")))
        conn.commit()
        return jsonify({"message": "Activité ajoutée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@excursions_bp.route("/<int:id>/programme/<int:pid>", methods=["PUT"])
def update_programme_excursion(id, pid):
    data = request.json
    if not data.get("activite"):
        return jsonify({"error": "Activité requise"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE programme_excursion SET heure=%s, activite=%s, description=%s
        WHERE id=%s AND excursion_id=%s
        """, (data.get("heure"), data["activite"], data.get("description"), pid, id))
        conn.commit()
        return jsonify({"message": "Activité modifiée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@excursions_bp.route("/<int:id>/programme/<int:pid>", methods=["DELETE"])
def delete_programme_excursion(id, pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM programme_excursion WHERE id=%s AND excursion_id=%s", (pid, id))
        conn.commit()
        return jsonify({"message": "Activité supprimée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
