"""
WSGI config for suika_game project.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "suika_game.settings")

application = get_wsgi_application()
