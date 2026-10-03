FROM python:3.11-slim

ARG INSTALL_ML=true

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements.txt

RUN if [ "$INSTALL_ML" = "true" ]; then \
        apt-get update && apt-get install -y --no-install-recommends \
            tesseract-ocr tesseract-ocr-ron tesseract-ocr-rus poppler-utils \
        && rm -rf /var/lib/apt/lists/* \
        && pip install --no-cache-dir -r requirements-ml.txt; \
    fi

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
