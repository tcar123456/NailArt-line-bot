# 觸發 Zeabur 自動部署測試（monorepo 子目錄）
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 2 app:app
