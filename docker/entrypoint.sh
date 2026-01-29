#!/bin/sh
set -e

python manage.py migrate --noinput

if [ "${COLLECTSTATIC:-1}" != "0" ]; then
  python manage.py collectstatic --noinput
fi

exec gunicorn suika_game.wsgi:application --bind "0.0.0.0:${PORT:-8000}"
