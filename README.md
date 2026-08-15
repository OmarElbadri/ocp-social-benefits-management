# OCP Social Benefits Management System

A full-stack web application built to manage employee social benefits and family activities — spouses, children, summer camps, and excursions — for a large industrial employer (OCP Group). Built during a technical internship at OCP's Service de Gestion des Avantages Sociaux, Khouribga, Morocco.

## What it does

Employees at OCP Group are entitled to a range of family-oriented social benefits: summer camps for children, group excursions, and related programs. Before this system, managing requests, participant eligibility, and scheduling for these programs was largely manual. This application digitizes that process end-to-end:

- **Employee & family records** — track employees, spouses, and children as distinct participant types
- **Camps & excursions management** — create and manage camp sessions and excursions, including schedules, capacity, and age/gender-based group assignments
- **Participation tracking** — register employees, spouses, or children into specific excursions or camp groups, with dedicated programs (daily activities) per camp/excursion
- **Group & supervisor (encadrant) management** — organize campers into groups with assigned supervisors, capacity limits, and age ranges
- **Authentication** — JWT-based login to protect access to the system

## Tech stack

- **Backend:** Python, Flask (blueprint-based route structure)
- **Database:** MySQL, with connection pooling (`mysql-connector-python`)
- **Auth:** Flask-JWT-Extended
- **Frontend:** HTML, CSS, JavaScript (served via Flask templates + static assets)
- **Environment config:** python-dotenv (credentials and secrets kept out of source control)

## Project structure

├── app.py # App entry point, blueprint registration, DB schema init
├── models/
│ ├── db.py # MySQL connection pooling
| └── __init__.py
├── routes/
│ ├── auth.py # Login / JWT authentication
| ├── __init__.py
│ ├── employes.py # Employee records
│ ├── conjoints.py # Spouse records
│ ├── enfants.py # Children records
│ ├── camps.py # Camp sessions
│ ├── excursions.py # Excursions
│ └── encadrants.py # Camp supervisors
├── static/ # CSS, JS, images
└── templates/ # HTML templates

## Setup

1. Clone the repository
2. Install dependencies: pip install -r requirements.txt
3. Create a `.env` file in the project root with the following variables (see `.env.example`):
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=gestion_avantages
JWT_SECRET_KEY=your_random_secret_key
4. Run the app:
python app.py

   The app will be available at `http://localhost:5001`.

## Notes

This project was built collaboratively with a fellow intern — we worked side-by-side on every part of the system rather than splitting tasks by feature.

## Author

**Omar El Badri** — Computer Engineering student