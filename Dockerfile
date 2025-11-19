FROM python:3.12-slim

WORKDIR /app

# Install git
RUN apt-get update \
    && apt-get install -y git \
    && rm -rf /var/lib/apt/lists/*

# Clone the repo
RUN git clone https://github.com/testbenchcc/Mermaid-Local.git

# Switch into the repo directory for the next steps
WORKDIR /app/Mermaid-Local

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
