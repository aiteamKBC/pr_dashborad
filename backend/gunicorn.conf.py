import multiprocessing
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
bind = "127.0.0.1:8010"
chdir = str(BASE_DIR)
wsgi_app = "config.wsgi:application"

# Keep the worker count predictable on small VPS instances.
workers = max(2, multiprocessing.cpu_count() * 2 + 1)
threads = 2
timeout = 60
graceful_timeout = 30
keepalive = 5

accesslog = "-"
errorlog = "-"
capture_output = True
