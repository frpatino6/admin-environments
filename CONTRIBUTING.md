# 🤝 Guía de Contribución - Admin Environments

¡Gracias por tu interés en contribuir a Admin Environments! Esta guía te ayudará a hacer contribuciones efectivas.

## 📋 Tabla de Contenidos

1. [Código de Conducta](#código-de-conducta)
2. [Cómo Empezar](#cómo-empezar)
3. [Proceso de Desarrollo](#proceso-de-desarrollo)
4. [Estándares de Código](#estándares-de-código)
5. [Commits y PRs](#commits-y-prs)
6. [Reportar Bugs](#reportar-bugs)
7. [Proponer Features](#proponer-features)

## 📜 Código de Conducta

- 🤝 Sé respetuoso y profesional
- 💡 Acepta feedback constructivo
- 🌟 Ayuda a otros contribuidores
- 📝 Documenta tus cambios
- ✅ Prueba antes de enviar PR

## 🚀 Cómo Empezar

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub, luego:
git clone https://github.com/TU-USUARIO/admin-environments.git
cd admin-environments
```

### 2. Configurar Ambiente

```bash
# Actualizar Node.js a v20.19+ o v22.x
node --version

# Instalar dependencias
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurar Variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edita backend/.env con tus credenciales
```

### 4. Ejecutar en Desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

### 5. Crear Branch

```bash
git checkout -b feature/nombre-descriptivo
# o
git checkout -b fix/descripcion-bug
# o
git checkout -b docs/actualizacion-readme
```

## 🔄 Proceso de Desarrollo

### Tipos de Branches

- `feature/*` - Nuevas funcionalidades
- `fix/*` - Corrección de bugs
- `docs/*` - Actualización de documentación
- `refactor/*` - Refactorización de código
- `test/*` - Agregar o mejorar tests
- `chore/*` - Tareas de mantenimiento

### Workflow

1. **Crear issue** describiendo el cambio
2. **Asignarte** el issue
3. **Crear branch** desde `main`
4. **Desarrollar** con commits frecuentes
5. **Probar** exhaustivamente
6. **Documentar** cambios
7. **Push** a tu fork
8. **Crear PR** a `main`

## 📝 Estándares de Código

### Backend (Node.js)

#### Estructura de Archivos
```javascript
// routes/nueva-ruta.js
const express = require('express');
const router = express.Router();

// Documentar endpoint
/**
 * GET /api/nueva-ruta
 * Descripción del endpoint
 */
router.get('/nueva-ruta', async (req, res) => {
  try {
    // Lógica aquí
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
```

#### Convenciones
- ✅ Usar `async/await` en lugar de callbacks
- ✅ Manejo de errores con try/catch
- ✅ Validar datos de entrada
- ✅ Retornar status codes apropiados
- ✅ Logs descriptivos

### Frontend (Angular)

#### Estructura de Componentes
```typescript
// componente.component.ts
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-mi-componente',
  standalone: true,
  templateUrl: './componente.component.html',
  styleUrl: './componente.component.scss'
})
export class MiComponente implements OnInit {
  // Propiedades públicas primero
  titulo = 'Mi Componente';
  
  // Propiedades privadas después
  private data: any[] = [];

  constructor(private servicio: MiServicio) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // Métodos públicos
  public metodoPublico(): void {
    // Implementación
  }

  // Métodos privados
  private cargarDatos(): void {
    // Implementación
  }
}
```

#### Convenciones
- ✅ Componentes standalone (Angular 17+)
- ✅ Tipos TypeScript explícitos
- ✅ Observables con async pipe cuando sea posible
- ✅ Unsubscribe de observables en ngOnDestroy
- ✅ Nombres descriptivos para variables y métodos
- ✅ SCSS para estilos (no CSS inline)

### Nombres

#### Variables y Funciones (camelCase)
```typescript
const miVariable = 'valor';
function miFuncion() {}
```

#### Clases y Componentes (PascalCase)
```typescript
class MiClase {}
class MiComponentComponent {}
```

#### Constantes (UPPER_SNAKE_CASE)
```typescript
const MAX_RETRIES = 3;
const API_BASE_URL = 'http://...';
```

#### Archivos
- Backend: `kebab-case.js` (environment-service.js)
- Frontend: `kebab-case.component.ts`

## 💬 Commits y PRs

### Formato de Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(scope): descripción corta

Descripción larga opcional

Fixes #123
```

#### Tipos de Commit
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan lógica)
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento

#### Ejemplos
```bash
feat(backend): agregar endpoint para historial de despliegues

Se agregó GET /api/environments/:name/history que retorna
el historial de los últimos 10 despliegues del ambiente.

Fixes #15

---

fix(frontend): corregir formato de fecha en tarjetas

La fecha se mostraba en formato UTC, ahora se muestra
en timezone local del usuario.

Fixes #23

---

docs(readme): actualizar guía de instalación

Se agregó sección sobre cómo configurar MongoDB Atlas
y troubleshooting común.
```

### Pull Requests

#### Título
```
feat: descripción clara del cambio
fix: corrección específica
docs: actualización de documentación
```

#### Descripción del PR

```markdown
## Descripción
Breve descripción del cambio y su motivación.

## Tipo de cambio
- [ ] Bug fix (cambio que corrige un issue)
- [ ] Nueva funcionalidad (cambio que agrega funcionalidad)
- [ ] Breaking change (cambio que rompe compatibilidad)
- [ ] Documentación

## ¿Cómo se ha probado?
Describe las pruebas realizadas:
- [ ] Pruebas unitarias
- [ ] Pruebas manuales
- [ ] Probado en Chrome/Firefox/Safari

## Checklist
- [ ] Mi código sigue los estándares del proyecto
- [ ] He realizado self-review de mi código
- [ ] He comentado mi código en áreas complejas
- [ ] He actualizado la documentación
- [ ] Mis cambios no generan nuevas advertencias
- [ ] He agregado tests que prueban mi fix/feature
- [ ] Tests unitarios pasan localmente
- [ ] He probado en desarrollo

## Screenshots (si aplica)
[Agregar capturas de pantalla]

## Relacionado
Closes #123
Relates to #456
```

## 🐛 Reportar Bugs

### Template de Issue para Bugs

```markdown
## Descripción del Bug
Descripción clara y concisa del bug.

## Pasos para Reproducir
1. Ir a '...'
2. Click en '...'
3. Scroll hasta '...'
4. Ver error

## Comportamiento Esperado
Descripción de lo que esperabas que sucediera.

## Comportamiento Actual
Descripción de lo que realmente sucede.

## Screenshots
Si aplica, agregar capturas de pantalla.

## Entorno
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- Node.js: [e.g. v22.0.0]
- Angular: [e.g. 17.3.0]

## Logs o Errores
```
Pegar logs relevantes aquí
```

## Información Adicional
Cualquier otro contexto sobre el problema.
```

## 💡 Proponer Features

### Template de Issue para Features

```markdown
## Resumen de la Feature
Descripción clara y concisa de la funcionalidad propuesta.

## Motivación
¿Por qué es necesaria esta feature? ¿Qué problema resuelve?

## Descripción Detallada
Descripción completa de cómo debería funcionar.

## Alternativas Consideradas
¿Qué otras soluciones consideraste?

## Mockups/Wireframes
Si aplica, agregar diseños visuales.

## Impacto
- [ ] Frontend
- [ ] Backend
- [ ] Base de Datos
- [ ] API
- [ ] Documentación

## Prioridad
- [ ] Alta
- [ ] Media
- [ ] Baja

## Recursos Adicionales
Links, referencias, etc.
```

## ✅ Checklist Pre-PR

Antes de crear un Pull Request, verifica:

### General
- [ ] Actualicé mi branch con los últimos cambios de `main`
- [ ] No hay conflictos con `main`
- [ ] El código compila sin errores
- [ ] El código funciona correctamente

### Backend
- [ ] Endpoint probado con Thunder Client/Postman
- [ ] Manejo de errores implementado
- [ ] Validación de datos de entrada
- [ ] Logs agregados en lugares apropiados
- [ ] No hay credenciales hardcodeadas

### Frontend
- [ ] Componente renderiza correctamente
- [ ] No hay errores en consola del navegador
- [ ] Responsive design verificado
- [ ] Accesibilidad considerada
- [ ] Iconos y estilos apropiados

### Testing
- [ ] Probado en múltiples navegadores (si frontend)
- [ ] Probado en diferentes estados (libre/ocupado)
- [ ] Casos edge probados
- [ ] Error handling verificado

### Documentación
- [ ] README actualizado (si es necesario)
- [ ] Comentarios en código complejo
- [ ] API docs actualizadas (si cambió API)
- [ ] CHANGELOG actualizado (si aplica)

## 📚 Recursos

### Documentación del Proyecto
- [README.md](README.md)
- [SETUP.md](SETUP.md)
- [TESTING.md](TESTING.md)
- [VISUAL_GUIDE.md](VISUAL_GUIDE.md)

### Tecnologías
- [Angular Docs](https://angular.dev)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Angular Material](https://material.angular.io/)

### Herramientas
- [Thunder Client](https://www.thunderclient.com/) - Testing API
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI para MongoDB
- [Angular DevTools](https://angular.io/guide/devtools) - Extension para debugging

## 🎓 Aprende Más

### Para Principiantes
1. Fork y clone el repositorio
2. Lee SETUP.md para configurar
3. Explora el código existente
4. Empieza con issues etiquetados como `good-first-issue`
5. Haz preguntas en los issues

### Buenas Prácticas
- Commits pequeños y frecuentes
- Tests antes de hacer PR
- Documentar mientras desarrollas
- Pedir feedback temprano
- Revisar PRs de otros

## 🏆 Reconocimiento

Todos los contribuidores serán reconocidos en:
- Sección Contributors del README
- Release notes
- Página de agradecimientos (próximamente)

## 📞 ¿Preguntas?

- Crea un issue con la etiqueta `question`
- Revisa issues existentes
- Lee la documentación completa

## 🎉 ¡Gracias!

Tu contribución hace que este proyecto sea mejor para todos. ¡Gracias por tu tiempo y esfuerzo!

---

**Última actualización:** Febrero 2, 2026  
**Versión:** 1.0.0
