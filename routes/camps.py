from flask import Blueprint, request, jsonify
from models.db import get_connection

camps_bp = Blueprint('camps', __name__)


# ── Liste des camps ────────────────────────────────────────
@camps_bp.route("/", methods=["GET"])
def get_camps():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT c.id, c.nom, c.ville, COALESCE(c.ville_depart,'Khouribga') AS ville_depart, c.capacite, c.age_min, c.age_max,
               c.date_debut, c.date_fin, c.heure_depart, c.heure_retour,
               COUNT(DISTINCT p.id) AS nb_inscrits
        FROM camps c
        LEFT JOIN participation_camp p ON p.camp_id = c.id
        GROUP BY c.id
        ORDER BY c.id
        """)
        camps = cursor.fetchall()

        cursor.execute("""
        SELECT g.id, g.camp_id, g.nom, g.genre, g.age_min, g.age_max,
               g.capacite, g.encadrant_id,
               e.nom AS encadrant_nom,
               COUNT(pc.id) AS nb_membres
        FROM groupes_camp g
        LEFT JOIN encadrants e ON g.encadrant_id = e.id
        LEFT JOIN participation_camp pc ON pc.groupe_id = g.id
        GROUP BY g.id
        ORDER BY g.camp_id, g.age_min, g.genre
        """)
        all_groupes = cursor.fetchall()

        groupes_by_camp = {}
        for g in all_groupes:
            cid = g['camp_id']
            groupes_by_camp.setdefault(cid, []).append(g)

        for c in camps:
            c['groupes'] = groupes_by_camp.get(c['id'], [])
            for col in ('date_debut', 'date_fin'):
                if c.get(col):
                    c[col] = str(c[col])
                else:
                    c[col] = None

        return jsonify(camps)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Créer un camp ──────────────────────────────────────────
@camps_bp.route("/", methods=["POST"])
def add_camp():
    data = request.json
    if not data.get("nom") or not data.get("ville") or not data.get("capacite"):
        return jsonify({"error": "Nom, ville et capacité requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO camps (nom, ville, ville_depart, capacite, age_min, age_max, date_debut, date_fin, heure_depart, heure_retour)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (data["nom"], data["ville"], data.get("ville_depart") or "Khouribga",
              data["capacite"], data.get("age_min"), data.get("age_max"),
              data.get("date_debut") or None, data.get("date_fin") or None,
              data.get("heure_depart") or None, data.get("heure_retour") or None))
        conn.commit()
        return jsonify({"message": "Camp ajouté"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Modifier un camp ───────────────────────────────────────
@camps_bp.route("/<int:id>", methods=["PUT"])
def update_camp(id):
    data = request.json
    if not data.get("nom") or not data.get("ville"):
        return jsonify({"error": "Nom et ville requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE camps SET nom=%s, ville=%s, ville_depart=%s, capacite=%s, age_min=%s, age_max=%s,
               date_debut=%s, date_fin=%s, heure_depart=%s, heure_retour=%s
        WHERE id=%s
        """, (data["nom"], data["ville"], data.get("ville_depart") or "Khouribga",
              data.get("capacite"), data.get("age_min"), data.get("age_max"),
              data.get("date_debut") or None, data.get("date_fin") or None,
              data.get("heure_depart") or None, data.get("heure_retour") or None, id))
        conn.commit()
        return jsonify({"message": "Camp modifié"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Supprimer un camp ──────────────────────────────────────
@camps_bp.route("/<int:id>", methods=["DELETE"])
def delete_camp(id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM camps WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Camp supprimé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Inscrire un enfant (auto-assign groupe) ────────────────
@camps_bp.route("/<int:id>/inscrire", methods=["POST"])
def inscrire_camp(id):
    data = request.json
    enfant_id = data.get("enfant_id")
    if not enfant_id:
        return jsonify({"error": "enfant_id requis"}), 400
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Vérifier que le camp existe et récupérer ses infos
        cursor.execute("""
            SELECT c.nom, c.capacite, c.age_min, c.age_max, c.date_debut,
                   COUNT(pc.id) AS nb_inscrits
            FROM camps c
            LEFT JOIN participation_camp pc ON pc.camp_id = c.id
            WHERE c.id = %s GROUP BY c.id
        """, (id,))
        camp = cursor.fetchone()
        if not camp:
            return jsonify({"error": "Camp introuvable"}), 404

        # Vérifier capacité globale du camp
        if camp['capacite'] and camp['nb_inscrits'] >= camp['capacite']:
            return jsonify({"error":
                f"Le camp « {camp['nom']} » est complet "
                f"({camp['nb_inscrits']}/{camp['capacite']} places utilisées). "
                "Inscription impossible."}), 409

        # Vérifier inscription en double dans ce même camp
        cursor.execute(
            "SELECT id FROM participation_camp WHERE camp_id=%s AND enfant_id=%s",
            (id, enfant_id))
        if cursor.fetchone():
            return jsonify({"error": "Cet enfant est déjà inscrit à ce camp"}), 409

        # Règle métier : un enfant ne peut participer qu'à UN seul camp par année
        annee_camp = camp['date_debut'].year if camp['date_debut'] else None
        if annee_camp:
            cursor.execute("""
                SELECT c2.nom, c2.date_debut
                FROM participation_camp pc2
                JOIN camps c2 ON pc2.camp_id = c2.id
                WHERE pc2.enfant_id = %s
                  AND pc2.camp_id != %s
                  AND YEAR(COALESCE(c2.date_debut, CURDATE())) = %s
            """, (enfant_id, id, annee_camp))
        else:
            cursor.execute("""
                SELECT c2.nom, c2.date_debut
                FROM participation_camp pc2
                JOIN camps c2 ON pc2.camp_id = c2.id
                WHERE pc2.enfant_id = %s
                  AND pc2.camp_id != %s
                  AND YEAR(COALESCE(c2.date_debut, CURDATE())) = YEAR(CURDATE())
            """, (enfant_id, id))
        camp_existant = cursor.fetchone()
        if camp_existant:
            annee_str = str(annee_camp) if annee_camp else "en cours"
            date_str = (str(camp_existant['date_debut'])[:10]
                        if camp_existant['date_debut'] else "cette année")
            return jsonify({"error":
                f"Cet enfant participe déjà au camp « {camp_existant['nom']} » "
                f"en {annee_str} (départ : {date_str}). "
                "Un enfant ne peut bénéficier que d'un seul camp par an."}), 409

        # Récupérer les infos de l'enfant
        cursor.execute("SELECT nom, age, genre FROM enfants WHERE id=%s", (enfant_id,))
        enfant = cursor.fetchone()
        if not enfant:
            return jsonify({"error": "Enfant introuvable"}), 404

        age = int(enfant['age'] or 0)
        genre_raw = (enfant['genre'] or '').lower()
        genre_key = 'fille' if 'fil' in genre_raw else 'garcon'
        genre_lbl = 'Fille' if genre_key == 'fille' else 'Garçon'

        # Vérifier si le camp a des groupes définis
        cursor.execute(
            "SELECT COUNT(*) AS nb FROM groupes_camp WHERE camp_id=%s", (id,))
        has_groups = cursor.fetchone()['nb'] > 0

        groupe_id = None
        groupe_nom = None

        if has_groups:
            # Chercher les groupes qui correspondent aux critères (âge + genre)
            cursor.execute("""
                SELECT g.id, g.nom, g.genre, g.age_min, g.age_max, g.capacite,
                       COUNT(pc.id) AS nb_membres
                FROM groupes_camp g
                LEFT JOIN participation_camp pc ON pc.groupe_id = g.id
                WHERE g.camp_id = %s
                  AND g.age_min <= %s AND g.age_max >= %s
                  AND (g.genre = %s OR g.genre = 'mixte')
                GROUP BY g.id
                ORDER BY g.age_min ASC
            """, (id, age, age, genre_key))
            matching = cursor.fetchall()

            if not matching:
                # Aucun groupe ne correspond — expliquer pourquoi
                cursor.execute("""
                    SELECT nom, genre, age_min, age_max FROM groupes_camp
                    WHERE camp_id=%s ORDER BY age_min
                """, (id,))
                all_groups = cursor.fetchall()
                groups_info = " | ".join([
                    f"{g['nom']} ({g['genre']} · {g['age_min']}–{g['age_max']} ans)"
                    for g in all_groups
                ])
                return jsonify({"error":
                    f"Aucun groupe ne correspond à cet enfant "
                    f"({genre_lbl}, {age} ans). "
                    f"Groupes disponibles : {groups_info}"}), 409

            # Parmi les groupes compatibles, trouver un qui a de la place
            available = [g for g in matching if g['nb_membres'] < g['capacite']]
            if not available:
                full_info = " | ".join([
                    f"{g['nom']} ({g['nb_membres']}/{g['capacite']} places)"
                    for g in matching
                ])
                return jsonify({"error":
                    f"Tous les groupes correspondants pour cet enfant "
                    f"({genre_lbl}, {age} ans) sont complets : {full_info}"}), 409

            groupe_id  = available[0]['id']
            groupe_nom = available[0]['nom']

        # Inscrire l'enfant
        cursor.execute(
            "INSERT INTO participation_camp (camp_id, enfant_id, groupe_id) VALUES (%s,%s,%s)",
            (id, enfant_id, groupe_id))
        conn.commit()

        if groupe_nom:
            return jsonify({
                "message": f"Enfant inscrit et assigné automatiquement au groupe « {groupe_nom} »",
                "groupe_nom": groupe_nom
            })
        return jsonify({"message": "Enfant inscrit au camp"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Réassigner automatiquement tous les enfants (sans groupe + mal placés) ──
@camps_bp.route("/<int:id>/reassigner-groupes", methods=["POST"])
def reassigner_groupes(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Enfants sans groupe
        cursor.execute("""
            SELECT pc.id AS pc_id, en.id AS enfant_id, en.nom, en.age, en.genre,
                   NULL AS current_groupe_id
            FROM participation_camp pc
            JOIN enfants en ON pc.enfant_id = en.id
            WHERE pc.camp_id = %s AND pc.groupe_id IS NULL
        """, (id,))
        a_traiter = cursor.fetchall()

        # 2. Enfants dans un groupe qui ne correspond pas à leur âge ou genre
        cursor.execute("""
            SELECT pc.id AS pc_id, en.id AS enfant_id, en.nom, en.age, en.genre,
                   pc.groupe_id AS current_groupe_id
            FROM participation_camp pc
            JOIN enfants en ON pc.enfant_id = en.id
            JOIN groupes_camp g ON pc.groupe_id = g.id
            WHERE pc.camp_id = %s
              AND (
                en.age < g.age_min OR en.age > g.age_max
                OR (g.genre != 'mixte'
                    AND ((g.genre = 'fille' AND en.genre NOT LIKE '%%fil%%')
                      OR (g.genre = 'garcon' AND en.genre LIKE '%%fil%%')))
              )
        """, (id,))
        mal_places = cursor.fetchall()
        a_traiter += mal_places

        if not a_traiter:
            return jsonify({
                "message": "Tous les enfants sont déjà dans le bon groupe.",
                "assigned": 0, "failed": []
            })

        assigned = 0
        failed   = []

        for enfant in a_traiter:
            age       = int(enfant['age'] or 0)
            genre_raw = (enfant['genre'] or '').lower()
            genre_key = 'fille' if 'fil' in genre_raw else 'garcon'
            genre_lbl = 'Fille' if genre_key == 'fille' else 'Garçon'

            # Chercher le meilleur groupe compatible avec de la place
            # (exclure le groupe actuel pour permettre la rotation)
            cursor.execute("""
                SELECT g.id, g.nom, g.capacite,
                       COUNT(pc2.id) AS nb_membres
                FROM groupes_camp g
                LEFT JOIN participation_camp pc2 ON pc2.groupe_id = g.id
                WHERE g.camp_id = %s
                  AND g.age_min <= %s AND g.age_max >= %s
                  AND (g.genre = %s OR g.genre = 'mixte')
                GROUP BY g.id
                HAVING nb_membres < g.capacite
                ORDER BY g.age_min ASC
                LIMIT 1
            """, (id, age, age, genre_key))
            groupe = cursor.fetchone()

            if groupe:
                cursor.execute(
                    "UPDATE participation_camp SET groupe_id = %s WHERE id = %s",
                    (groupe['id'], enfant['pc_id']))
                assigned += 1
            else:
                failed.append(f"{enfant['nom']} ({genre_lbl}, {age} ans)")

        conn.commit()

        nb_corriges = len(mal_places)
        nb_nouveaux = assigned - nb_corriges if assigned > nb_corriges else assigned
        parts = []
        if nb_nouveaux > 0:
            parts.append(f"{nb_nouveaux} enfant(s) assigné(s)")
        if nb_corriges > 0 and assigned >= nb_corriges:
            parts.append(f"{nb_corriges} erreur(s) de groupe corrigée(s)")
        msg = " · ".join(parts) + "." if parts else "Aucune modification nécessaire."
        if failed:
            msg += f" {len(failed)} enfant(s) sans groupe compatible : {', '.join(failed)}."

        return jsonify({"message": msg, "assigned": assigned, "failed": failed})

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Enfants éligibles pour un camp (filtres âge + règle annuelle) ──
@camps_bp.route("/<int:id>/enfants-eligibles", methods=["GET"])
def get_enfants_eligibles(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT nom, capacite, age_min, age_max, date_debut FROM camps WHERE id=%s", (id,))
        camp = cursor.fetchone()
        if not camp:
            return jsonify({"error": "Camp introuvable"}), 404

        age_min   = camp['age_min']  or 0
        age_max   = camp['age_max']  or 99
        annee_camp = camp['date_debut'].year if camp['date_debut'] else None

        # Enfants dans la bonne tranche d'âge, pas déjà inscrits à CE camp,
        # et pas déjà inscrits à un autre camp la même année
        cursor.execute("""
            SELECT en.id, en.nom, en.age, en.genre,
                   e.nom AS employe_nom,
                   (SELECT c2.nom FROM participation_camp pc2
                    JOIN camps c2 ON pc2.camp_id = c2.id
                    WHERE pc2.enfant_id = en.id
                      AND pc2.camp_id != %s
                      AND YEAR(COALESCE(c2.date_debut, CURDATE())) = %s
                    LIMIT 1) AS camp_annee_existant
            FROM enfants en
            LEFT JOIN employes e ON en.employe_id = e.id
            WHERE en.age >= %s AND en.age <= %s
              AND en.id NOT IN (
                  SELECT enfant_id FROM participation_camp WHERE camp_id = %s
              )
            ORDER BY en.age, en.nom
        """, (id, annee_camp or 0, age_min, age_max, id))
        enfants = cursor.fetchall()

        return jsonify({
            "annee": annee_camp,
            "age_min": age_min,
            "age_max": age_max,
            "enfants": enfants
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Participants d'un camp ─────────────────────────────────
@camps_bp.route("/<int:id>/participants", methods=["GET"])
def get_participants_camp(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT pc.id, en.id AS enfant_id, en.nom, en.age, en.genre,
               e.nom AS employe_nom, pc.groupe_id, g.nom AS groupe_nom
        FROM participation_camp pc
        JOIN enfants en ON pc.enfant_id = en.id
        LEFT JOIN employes e ON en.employe_id = e.id
        LEFT JOIN groupes_camp g ON pc.groupe_id = g.id
        WHERE pc.camp_id = %s
        ORDER BY en.nom
        """, (id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Retirer un participant d'un camp ───────────────────────
@camps_bp.route("/<int:id>/participants/<int:pid>", methods=["DELETE"])
def remove_participant_camp(id, pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM participation_camp WHERE id=%s AND camp_id=%s", (pid, id))
        conn.commit()
        return jsonify({"message": "Enfant retiré du camp"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Groupes d'un camp ──────────────────────────────────────
@camps_bp.route("/<int:id>/groupes", methods=["GET"])
def get_groupes_camp(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT g.id, g.nom, g.genre, g.age_min, g.age_max, g.capacite,
               g.encadrant_id, e.nom AS encadrant_nom,
               COUNT(pc.id) AS nb_membres
        FROM groupes_camp g
        LEFT JOIN encadrants e ON g.encadrant_id = e.id
        LEFT JOIN participation_camp pc ON pc.groupe_id = g.id
        WHERE g.camp_id = %s
        GROUP BY g.id
        ORDER BY g.age_min, g.genre
        """, (id,))
        groupes = cursor.fetchall()

        for g in groupes:
            cursor.execute("""
            SELECT pc.id, en.nom, en.age, en.genre, e.nom AS employe_nom,
                   CASE
                     WHEN en.age < g2.age_min OR en.age > g2.age_max THEN 1
                     WHEN g2.genre != 'mixte'
                          AND ((g2.genre = 'fille' AND en.genre NOT LIKE '%%fil%%')
                            OR (g2.genre = 'garcon' AND en.genre LIKE '%%fil%%')) THEN 1
                     ELSE 0
                   END AS mauvais_groupe
            FROM participation_camp pc
            JOIN enfants en ON pc.enfant_id = en.id
            JOIN groupes_camp g2 ON g2.id = pc.groupe_id
            LEFT JOIN employes e ON en.employe_id = e.id
            WHERE pc.groupe_id = %s
            ORDER BY en.nom
            """, (g['id'],))
            g['membres'] = cursor.fetchall()

        # Enfants inscrits sans groupe
        cursor.execute("""
        SELECT pc.id, en.nom, en.age, en.genre, e.nom AS employe_nom
        FROM participation_camp pc
        JOIN enfants en ON pc.enfant_id = en.id
        LEFT JOIN employes e ON en.employe_id = e.id
        WHERE pc.camp_id = %s AND (pc.groupe_id IS NULL)
        ORDER BY en.nom
        """, (id,))
        sans_groupe = cursor.fetchall()
        if sans_groupe:
            groupes.append({
                'id': None,
                'nom': 'Sans groupe',
                'genre': 'mixte',
                'age_min': 0,
                'age_max': 99,
                'capacite': len(sans_groupe),
                'encadrant_id': None,
                'encadrant_nom': None,
                'nb_membres': len(sans_groupe),
                'membres': sans_groupe,
                'sans_groupe': True
            })

        return jsonify(groupes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/groupes", methods=["POST"])
def add_groupe_camp(id):
    data = request.json
    if not data.get("nom"):
        return jsonify({"error": "Nom requis"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO groupes_camp (camp_id, nom, genre, age_min, age_max, capacite, encadrant_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (id, data["nom"], data.get("genre", "mixte"),
              data.get("age_min", 0), data.get("age_max", 99),
              data.get("capacite", 20), data.get("encadrant_id") or None))
        conn.commit()
        return jsonify({"message": "Groupe créé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/groupes/<int:gid>", methods=["PUT"])
def update_groupe_camp(id, gid):
    data = request.json
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE groupes_camp
        SET nom=%s, genre=%s, age_min=%s, age_max=%s, capacite=%s, encadrant_id=%s
        WHERE id=%s AND camp_id=%s
        """, (data.get("nom"), data.get("genre", "mixte"),
              data.get("age_min", 0), data.get("age_max", 99),
              data.get("capacite", 20), data.get("encadrant_id") or None,
              gid, id))
        conn.commit()
        return jsonify({"message": "Groupe modifié"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/groupes/<int:gid>", methods=["DELETE"])
def delete_groupe_camp(id, gid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM groupes_camp WHERE id=%s AND camp_id=%s", (gid, id))
        conn.commit()
        return jsonify({"message": "Groupe supprimé"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Programme d'un camp ────────────────────────────────────
@camps_bp.route("/<int:id>/programme", methods=["GET"])
def get_programme_camp(id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
        SELECT id, jour, heure, activite, description
        FROM programme_camp WHERE camp_id=%s ORDER BY id ASC, heure ASC
        """, (id,))
        return jsonify(cursor.fetchall())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/programme", methods=["POST"])
def add_programme_camp(id):
    data = request.json
    if not data.get("activite"):
        return jsonify({"error": "Activité requise"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO programme_camp (camp_id, jour, heure, activite, description)
        VALUES (%s, %s, %s, %s, %s)
        """, (id, data.get("jour"), data.get("heure"),
              data["activite"], data.get("description")))
        conn.commit()
        return jsonify({"message": "Activité ajoutée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/programme/<int:pid>", methods=["PUT"])
def update_programme_camp(id, pid):
    data = request.json
    if not data.get("activite"):
        return jsonify({"error": "Activité requise"}), 400
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE programme_camp SET jour=%s, heure=%s, activite=%s, description=%s
        WHERE id=%s AND camp_id=%s
        """, (data.get("jour"), data.get("heure"), data["activite"],
              data.get("description"), pid, id))
        conn.commit()
        return jsonify({"message": "Activité modifiée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@camps_bp.route("/<int:id>/programme/<int:pid>", methods=["DELETE"])
def delete_programme_camp(id, pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM programme_camp WHERE id=%s AND camp_id=%s", (pid, id))
        conn.commit()
        return jsonify({"message": "Activité supprimée"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
