import os

DATABASE_URL = os.environ.get("DATABASE_URL")
ELEXON_BASE_URL = os.environ.get("ELEXON_BASE_URL")
WINDOW_FROM = os.environ.get("WINDOW_FROM")
WINDOW_TO = os.environ.get("WINDOW_TO")
CUTOFF_TIME = os.environ.get("CUTOFF_TIME")
