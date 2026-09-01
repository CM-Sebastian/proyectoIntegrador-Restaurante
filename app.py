from app import create_app  # Quitamos el punto inicial (".app" -> "app")

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
