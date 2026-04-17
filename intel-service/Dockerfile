# ---- Stage 1: Compile privacy-core Rust library ----
FROM rust:1.88-slim-bookworm AS rust-builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libssl-dev \
    && rm -rf /var/lib/apt/lists/*

COPY intel-vendor/privacy-core /build/privacy-core
WORKDIR /build/privacy-core
RUN cargo build --release --lib

# ---- Stage 2: Python intel service ----
FROM python:3.11-slim-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

ADD https://astral.sh/uv/install.sh /uv-installer.sh
RUN sh /uv-installer.sh && rm /uv-installer.sh

ENV PATH="/root/.local/bin:$PATH"
ENV UV_PROJECT_ENVIRONMENT=/usr/local

COPY intel-vendor/pyproject.toml /workspace/pyproject.toml
COPY intel-vendor/uv.lock /workspace/uv.lock
COPY intel-vendor/backend/pyproject.toml /workspace/backend/pyproject.toml

RUN cd /workspace/backend && uv sync --frozen --no-dev

COPY intel-vendor/backend /app/intel-vendor/backend
COPY intel-vendor/privacy-core /app/intel-vendor/privacy-core
COPY intel-service /app/intel-service

RUN npm ci --omit=dev --prefix /app/intel-vendor/backend

COPY --from=rust-builder /build/privacy-core/target/release/libprivacy_core.so /app/libprivacy_core.so

ENV PRIVACY_CORE_LIB=/app/libprivacy_core.so

RUN addgroup --system intel \
    && adduser --system --uid 1001 --ingroup intel intel \
    && mkdir -p /app/intel-vendor/backend/data \
    && chown -R intel:intel /app

USER intel

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --retries=10 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--app-dir", "/app/intel-service", "--timeout-keep-alive", "120"]
