from main import create_runtime_app


# Vercel 會尋找名為 app 的 WSGI 應用程式。
app = create_runtime_app()
