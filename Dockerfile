FROM python:3.11-slim as builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

FROM python:3.11-slim as production

LABEL maintainer="Senior Backend Developer" \
      version="1.0.0" \
      description="Green API Flask Web Interface"

RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

ARG apiUrl \
    mediaUrl \
    idInstance \
    apiTokenInstance

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    FLASK_APP=app.py \
    FLASK_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    apiUrl=${apiUrl} \
    mediaUrl=${mediaUrl} \
    idInstance=${idInstance} \
    apiTokenInstance=${apiTokenInstance}

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

COPY --chown=appuser:appgroup app.py .
COPY --chown=appuser:appgroup templates/ templates/
COPY --chown=appuser:appgroup static/ static/
COPY --chown=appuser:appgroup .env .env

RUN mkdir -p /app/logs && chown appuser:appgroup /app/logs

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5000/api/health', timeout=5)" || exit 1

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--access-logfile", "-", "--error-logfile", "-", "app:app"]
