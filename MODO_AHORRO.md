# Modo Ahorro (anti-creditos)

Usa el chat local para evitar gastar creditos de Copilot en tareas normales.

## Activar en 1 comando

Desde la carpeta del proyecto:

./scripts/mode-ahorro.sh

Esto hace:
- Cierra procesos ruidosos de Ollama/llama-server.
- Arranca el chat local en segundo plano.
- Intenta abrir el chat en el navegador.

## URL del chat

- http://127.0.0.1:4895/
- Fallback: http://127.0.0.1:4891/

## Si quieres usar script de package.json

npm run modo:ahorro

## Regla para ahorrar creditos cuando uses Copilot

Pega esto al inicio de cada pedido:

"Modo ahorro: respuesta corta, sin leer archivos extra, sin herramientas salvo que yo lo pida, un solo intento."
