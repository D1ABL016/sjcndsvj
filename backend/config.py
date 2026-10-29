import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://wind:wind@localhost:5435/wind_dashboard")
ELEXON_BASE_URL = os.environ.get("ELEXON_BASE_URL", "https://data.elexon.co.uk/bmrs/api/v1")
WINDOW_FROM = os.environ.get("WINDOW_FROM", "2026-01-02T00:00:00+00:00")
WINDOW_TO = os.environ.get("WINDOW_TO", "2026-02-01T00:00:00+00:00")
CUTOFF_TIME = os.environ.get("CUTOFF_TIME", "09:00")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
