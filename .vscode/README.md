# Admin Environments - Workspace Settings

## VS Code Tasks

Este proyecto incluye tareas de VS Code para facilitar el desarrollo.

### Ejecutar Tareas

Presiona `Ctrl+Shift+P` y escribe "Run Task", luego selecciona:

- **Install Backend**: Instala dependencias del backend
- **Install Frontend**: Instala dependencias del frontend
- **Start Backend**: Inicia el servidor backend
- **Start Frontend**: Inicia el servidor de desarrollo frontend
- **Build Frontend**: Compila el frontend para producción

### Atajos de Teclado Recomendados

Agrega estos atajos a tu `keybindings.json` (Ctrl+K Ctrl+S):

```json
[
  {
    "key": "ctrl+alt+b",
    "command": "workbench.action.tasks.runTask",
    "args": "Start Backend"
  },
  {
    "key": "ctrl+alt+f",
    "command": "workbench.action.tasks.runTask",
    "args": "Start Frontend"
  }
]
```

### Extensiones Recomendadas

- Angular Language Service
- ESLint
- Prettier
- Thunder Client (para probar API)
