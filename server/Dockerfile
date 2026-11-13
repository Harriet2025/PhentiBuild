# PhentiBuild Django backend — production image for Coolify.
#
#   docker build -t phentibuild-api ./server
#
# Runs gunicorn on port 8000. Migrations for Django's own tables run on
# start-up (the legacy tables are managed=False and are never altered).

# ---- build stage: compile mysqlclient --------------------------------
FROM python:3.13-slim AS build
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential pkg-config default-libmysqlclient-dev \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---- runtime stage ----------------------------------------------------
FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_ENV=production \
    DJANGO_DEBUG=false
RUN apt-get update \
 && apt-get install -y --no-install-recommends libmariadb3 curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels
COPY --chown=app:app . .
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8000/api/ping/ || exit 1

CMD ["sh", "-c", "python manage.py ensure_legacy_schema && python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --timeout 60 --access-logfile - --forwarded-allow-ips='*'"]
