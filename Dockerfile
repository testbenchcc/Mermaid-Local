FROM python:3.12-slim

# Install build deps only if you need them (example: npm for front-end build)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app
# Install system dependencies (if needed in future). Keep minimal for now.
RUN apt-get update
RUN apt-get install -y --no-install-recommends build-essential
RUN apt-get install -y npm
RUN rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY package.json ./
COPY scripts/build-mermaid.js ./scripts/build-mermaid.js
RUN npm install

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
