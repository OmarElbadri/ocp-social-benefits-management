from flask import Flask, jsonify, render_template
from routes.employes import employes_bp
from routes.enfants import enfants_bp
from routes.excursions import excursions_bp
from routes.conjoints import conjoints_bp
from routes.camps import camps_bp
from routes.auth import auth_bp
from routes.encadrants import encadrants_bp
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from models.db import get_connection
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.url_map.strict_slashes = False
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.config["TEMPLATES_AUTO_RELOAD"] = True

# JWT
app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY")
jwt = JWTManager(app)

# CORS — allow same-origin requests (frontend now served by Flask itself)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# ROUTES
app.register_blueprint(auth_bp,       url_prefix="/api/auth")
app.register_blueprint(employes_bp,   url_prefix="/api/employes")
app.register_blueprint(enfants_bp,    url_prefix="/api/enfants")
app.register_blueprint(excursions_bp, url_prefix="/api/excursions")
app.register_blueprint(conjoints_bp,  url_prefix="/api/conjoints")
app.register_blueprint(camps_bp,        url_prefix="/api/camps")
app.register_blueprint(encadrants_bp,  url_prefix="/api/encadrants")


def init_db():
    conn = get_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS participation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            excursion_id INT NOT NULL,
            employe_id INT DEFAULT NULL,
            enfant_id  INT DEFAULT NULL,
            epouse_id  INT DEFAULT NULL,
            type_participant VARCHAR(20) NOT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS participation_camp (
            id INT AUTO_INCREMENT PRIMARY KEY,
            camp_id   INT NOT NULL,
            enfant_id INT NOT NULL,
            groupe_id INT DEFAULT NULL
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS groupes_camp (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            camp_id   INT NOT NULL,
            nom       VARCHAR(100) NOT NULL,
            genre     VARCHAR(20)  DEFAULT 'mixte',
            age_min   INT          DEFAULT 0,
            age_max   INT          DEFAULT 99,
            capacite  INT          DEFAULT 20,
            encadrant VARCHAR(100)
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS programme_camp (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            camp_id     INT NOT NULL,
            jour        VARCHAR(50),
            heure       VARCHAR(10),
            activite    VARCHAR(200) NOT NULL,
            description TEXT
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS programme_excursion (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            excursion_id INT NOT NULL,
            heure        VARCHAR(10),
            activite     VARCHAR(200) NOT NULL,
            description  TEXT
        )
        """)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS encadrants (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            nom        VARCHAR(100) NOT NULL,
            sexe       VARCHAR(10),
            age        INT,
            specialite VARCHAR(150),
            telephone  VARCHAR(20),
            email      VARCHAR(100)
        )
        """)
        safe_alters = [
            "ALTER TABLE participation    ADD COLUMN IF NOT EXISTS employe_id    INT DEFAULT NULL",
            "ALTER TABLE participation    ADD COLUMN IF NOT EXISTS enfant_id     INT DEFAULT NULL",
            "ALTER TABLE participation    ADD COLUMN IF NOT EXISTS epouse_id     INT DEFAULT NULL",
            "ALTER TABLE participation    MODIFY COLUMN participant_id           INT DEFAULT NULL",
            "ALTER TABLE camps            ADD COLUMN IF NOT EXISTS date_debut    DATE",
            "ALTER TABLE camps            ADD COLUMN IF NOT EXISTS date_fin      DATE",
            "ALTER TABLE camps            ADD COLUMN IF NOT EXISTS heure_depart  VARCHAR(10) DEFAULT NULL",
            "ALTER TABLE camps            ADD COLUMN IF NOT EXISTS heure_retour  VARCHAR(10) DEFAULT NULL",
            "ALTER TABLE participation_camp ADD COLUMN IF NOT EXISTS groupe_id   INT DEFAULT NULL",
            "ALTER TABLE groupes_camp     ADD COLUMN IF NOT EXISTS encadrant_id  INT DEFAULT NULL",
            "ALTER TABLE epouses          ADD COLUMN IF NOT EXISTS sexe          VARCHAR(10) DEFAULT 'Femme'",
            "ALTER TABLE employes         ADD COLUMN IF NOT EXISTS sexe          VARCHAR(10) DEFAULT 'Homme'",
            "ALTER TABLE participation    ADD COLUMN IF NOT EXISTS epouse_id     INT DEFAULT NULL",
            "ALTER TABLE excursions       ADD COLUMN IF NOT EXISTS heure_depart  VARCHAR(10) DEFAULT NULL",
            "ALTER TABLE excursions       ADD COLUMN IF NOT EXISTS heure_retour  VARCHAR(10) DEFAULT NULL",
            "ALTER TABLE excursions       MODIFY COLUMN type                     VARCHAR(50)",
            "ALTER TABLE camps            ADD COLUMN ville_depart               VARCHAR(100) DEFAULT 'Khouribga'",
            "ALTER TABLE excursions       ADD COLUMN age_min_enfant              INT DEFAULT NULL",
            "ALTER TABLE excursions       ADD COLUMN age_max_enfant              INT DEFAULT NULL",
        ]
        for alter in safe_alters:
            try:
                cursor.execute(alter)
            except Exception as ae:
                print(f"alter warning: {ae}")

        # normalize excursion type casing (was stored as lowercase ENUM)
        try:
            cursor.execute("UPDATE excursions SET type='Famille' WHERE LOWER(type)='famille'")
            cursor.execute("UPDATE excursions SET type='Enfants' WHERE LOWER(type)='enfants'")
            conn.commit()
        except Exception as ce:
            print(f"type casing migration warning: {ce}")

        # rename epouses -> conjoints if old name still exists
        try:
            cursor.execute("SHOW TABLES LIKE 'epouses'")
            if cursor.fetchone():
                cursor.execute("RENAME TABLE epouses TO conjoints")
                conn.commit()
                print("Migration: renamed table epouses -> conjoints")
        except Exception as re:
            print(f"rename migration warning: {re}")

        # merge prenom into nom (run only if prenom column still exists)
        try:
            cursor.execute("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='employes' AND COLUMN_NAME='prenom'")
            if cursor.fetchone()[0] > 0:
                # build full name: "prenom nom" but avoid double-merge
                cursor.execute("""
                    UPDATE employes
                    SET nom = CONCAT(TRIM(COALESCE(prenom,'')), ' ', TRIM(COALESCE(nom,'')))
                    WHERE prenom IS NOT NULL AND TRIM(prenom) != ''
                """)
                cursor.execute("ALTER TABLE employes DROP COLUMN prenom")
                print("Migration: merged prenom into nom, dropped prenom column")
        except Exception as me:
            print(f"prenom migration warning: {me}")

        conn.commit()
    except Exception as e:
        print(f"init_db warning: {e}")
    finally:
        cursor.close()
        conn.close()


@app.after_request
def no_cache(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"]        = "no-cache"
    response.headers["Expires"]       = "0"
    return response


@app.route("/")
def home():
    return render_template("index.html")


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5001, debug=True)
