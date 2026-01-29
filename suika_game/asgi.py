"""
ASGI config for suika_game project.
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "suika_game.settings")

application = get_asgi_application()
