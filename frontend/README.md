# Admin Environments - Frontend

Frontend Angular 17 para gestión de ambientes dev4 y test4.

## Requisitos

- Node.js >= 20.19.0 || >= 22.12.0
- Angular CLI

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

El proxy está configurado para redirigir las llamadas a `/api` hacia `http://localhost:3000`

## Construcción

```bash
npm run build
```

Los archivos de producción estarán en `dist/`

## Estructura

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── dashboard/          # Componente principal del dashboard
│   │   │   └── deploy-dialog/      # Diálogo para desplegar rama
│   │   ├── models/
│   │   │   └── environment.model.ts # Interfaces TypeScript
│   │   ├── services/
│   │   │   └── environment.service.ts # Servicio HTTP
│   │   ├── app.component.ts
│   │   └── app.routes.ts
│   ├── proxy.conf.json             # Configuración proxy para desarrollo
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
└── tsconfig.json
```

## Características

- ✅ Visualización de ambientes dev4 y test4
- ✅ Indicadores de estado (Libre/Ocupado)
- ✅ Despliegue de ramas
- ✅ Liberación de ambientes
- ✅ Interfaz con Angular Material
- ✅ Responsive design
- ✅ Actualización en tiempo real
