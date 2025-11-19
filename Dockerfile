FROM python:3.12-slim

# Install build deps only if you need them (example: npm for front-end build)
# RUN apt-get update && apt-get install -y --no-install-recommends build-essential npm && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN apt-get update
RUN apt-get install -y git
RUN git clone https://github.com/testbenchcc/Mermaid-Local.git 
RUN cd Mermaid-Local
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt
EXPOSE 8000
RUN uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
