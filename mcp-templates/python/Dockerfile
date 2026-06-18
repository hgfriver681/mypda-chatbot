FROM python:3.12-slim

WORKDIR /app

# 先裝依賴（利用 layer cache）
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 再複製專案原始碼
COPY pyproject.toml ./
COPY server ./server

ENV PORT=8787
EXPOSE 8787

# healthcheck 打 /health（不需驗證）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import os,urllib.request,sys; \
    p=os.environ.get('PORT','8787'); \
    sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{p}/health',timeout=2).status==200 else 1)"

CMD ["python", "-m", "server.main"]
