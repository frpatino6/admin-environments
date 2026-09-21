# Guía de Pruebas - Admin Environments

## 🧪 Pruebas del Backend

### 1. Verificar que el servidor está corriendo

```bash
curl http://localhost:3000/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "message": "Server is running"
}
```

### 2. Inicializar ambientes (solo primera vez)

```bash
curl -X POST http://localhost:3000/api/environments/init
```

**Respuesta esperada:**
```json
{
  "message": "Ambientes inicializados",
  "results": [
    { "created": "dev4" },
    { "created": "test4" }
  ]
}
```

### 3. Obtener todos los ambientes

```bash
curl http://localhost:3000/api/environments
```

**Respuesta esperada:**
```json
[
  {
    "_id": "...",
    "name": "dev4",
    "status": "Libre",
    "branch": null,
    "deployedBy": null,
    "deployedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  },
  {
    "_id": "...",
    "name": "test4",
    "status": "Libre",
    "branch": null,
    "deployedBy": null,
    "deployedAt": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

### 4. Desplegar en dev4

```bash
curl -X POST http://localhost:3000/api/environments/dev4/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "feature/nueva-funcionalidad",
    "deployedBy": "Juan Pérez"
  }'
```

**Respuesta esperada:**
```json
{
  "_id": "...",
  "name": "dev4",
  "status": "Ocupado",
  "branch": "feature/nueva-funcionalidad",
  "deployedBy": "Juan Pérez",
  "deployedAt": "2026-02-02T...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**En Slack deberías ver:**
```
🚀 Ambiente dev4 ocupado con la rama feature/nueva-funcionalidad por Juan Pérez.
```

### 5. Liberar dev4

```bash
curl -X POST http://localhost:3000/api/environments/dev4/release
```

**Respuesta esperada:**
```json
{
  "_id": "...",
  "name": "dev4",
  "status": "Libre",
  "branch": null,
  "deployedBy": null,
  "deployedAt": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**En Slack deberías ver:**
```
✅ Ambiente dev4 ha sido liberado y está disponible para despliegue.
```

### 6. Intentar desplegar en ambiente ocupado (Error esperado)

```bash
# Primero despliega
curl -X POST http://localhost:3000/api/environments/test4/deploy \
  -H "Content-Type: application/json" \
  -d '{"branch": "develop", "deployedBy": "Test User"}'

# Intenta desplegar de nuevo
curl -X POST http://localhost:3000/api/environments/test4/deploy \
  -H "Content-Type: application/json" \
  -d '{"branch": "otro-branch", "deployedBy": "Otro Usuario"}'
```

**Respuesta esperada (error):**
```json
{
  "message": "Ambiente ya está ocupado con la rama develop por Test User"
}
```

### 7. Flujo manual de QA (registrar, solicitar, rechazar, iniciar)

```bash
# Registrar un integrante de QA para el equipo "xqo"
curl -X POST http://localhost:3000/api/qa/members \
  -H "Content-Type: application/json" \
  -d '{"name": "Ana QA", "slackUserId": "U01234567", "team": "xqo"}'
```

**Respuesta esperada:** el `QaMember` creado, con `active: true` y `lastAssignedAt: null`.

```bash
# Solicitar QA para un ticket (requesterId debe ser un QaMember del mismo equipo)
curl -X POST http://localhost:3000/api/qa/requests \
  -H "Content-Type: application/json" \
  -d '{
    "jiraKey": "ABC-123",
    "jiraSummary": "Nueva funcionalidad de login",
    "requesterId": "<id del QaMember solicitante>",
    "environmentName": "dev4",
    "team": "xqo"
  }'
```

**Respuesta esperada:** la solicitud queda en `status: "pending"` con un `reviewerId` asignado (el integrante activo del equipo con menor carga activa), y se envía una notificación a Slack con los botones "Iniciar QA" y "Rechazar".

```bash
# Rechazar la solicitud (reasigna automáticamente al siguiente candidato)
curl -X POST http://localhost:3000/api/qa/requests/<id>/reject \
  -H "Content-Type: application/json" \
  -d '{"reason": "No tengo contexto de este módulo"}'
```

**Respuesta esperada:** la solicitud sigue en `status: "pending"` pero con un `reviewerId` distinto, y se envía una nueva notificación a Slack. Si no quedan candidatos elegibles, pasa a `status: "unassignable"`.

```bash
# Iniciar la revisión (la abre el revisor asignado, vía el link "Iniciar QA")
curl -X POST http://localhost:3000/api/qa/requests/<id>/start
```

**Respuesta esperada:** `status: "in_progress"` y `acceptedAt` con la fecha/hora actual.

## 🤖 Pruebas Automatizadas del Backend (QA)

A diferencia del resto de esta guía (100% manual), el flujo de solicitud/revisión de QA sí cuenta con pruebas automatizadas — es la **primera infraestructura de testing automatizado de este backend**.

### Ejecutar las pruebas

```bash
cd backend
node --test test/
```

Usa el test runner nativo de Node.js (`node --test`, ver el script `test` en `backend/package.json`) — no hay dependencia de Jest/Mocha.

> Dos de los archivos (`qaRequestsRetry.test.js` y `qaRequestsTeamScoping.test.js`) se conectan a la base de datos real configurada en `backend/.env` — el proyecto no tiene una dependencia de MongoDB en memoria. Crean fixtures claramente marcadas (`test-retry-*`, `test-team-scoping-*`, prefijo de jiraKey `TEST-*`) y las limpian en `after()` incluso si una prueba falla.

### Qué cubre cada archivo

| Archivo | Cubre |
|---|---|
| `test/qaAssignment.test.js` | El algoritmo puro de asignación (`pickReviewer`/`compareByQueuePriority`): excluye al solicitante, prioriza menor carga activa, desempata por `lastAssignedAt` más antiguo (nunca asignado gana el desempate), y acumula exclusiones de múltiples rechazos en una sola llamada. |
| `test/qaRequestsService.test.js` | `computeExcludedReviewerIds`: acumula todos los rechazadores (no solo el último), deduplica ids repetidos y soporta valores tipo `ObjectId` vía `toString()`. |
| `test/qaRequestsInvariant.test.js` | Prueba de regresión del invariante "el solicitante nunca puede terminar siendo su propio revisor", simulando ciclos sucesivos de rechazo hasta agotar el pool de candidatos. |
| `test/qaRequestsRetry.test.js` | `retryQaRequest`: reabre una solicitud `changes_requested` de vuelta a `pending` con el **mismo** revisor (sin reasignar), resetea `lastReminderAt`/`completedAt`, y valida los errores 400/404. |
| `test/qaRequestsTeamScoping.test.js` | `buildCandidates`/`createQaRequest`: los rosters de QA están aislados por equipo (nunca se filtra el roster de otro equipo), se rechaza un solicitante que no pertenece al equipo de la solicitud, y se bloquea el placeholder `"shared"`. |

## 🎨 Pruebas del Frontend

### Prueba Manual Completa

1. **Abre el navegador:** `http://localhost:4200`

2. **Verifica la visualización inicial:**
   - ✅ Debes ver dos tarjetas: dev4 y test4
   - ✅ Ambas deben mostrar estado "Libre" con chip verde/azul
   - ✅ Botón "Desplegar Rama" visible en ambas

3. **Desplegar en dev4:**
   - Click en "Desplegar Rama" de dev4
   - Se abre un diálogo modal
   - Ingresa:
     - Rama: `feature/test-frontend`
     - Tu nombre: `Test User`
   - Click "Desplegar"
   - ✅ La tarjeta debe actualizarse mostrando:
     - Estado: "Ocupado" (chip rojo/naranja)
     - Rama: feature/test-frontend
     - Desplegado por: Test User
     - Fecha/hora actual
     - Botón cambia a "Liberar Ambiente"
   - ✅ Debe aparecer notificación snackbar verde
   - ✅ Verifica Slack para ver notificación

4. **Intentar desplegar de nuevo (debe fallar):**
   - La tarjeta dev4 solo muestra "Liberar Ambiente"
   - No hay botón de desplegar

5. **Liberar dev4:**
   - Click en "Liberar Ambiente"
   - Aparece confirmación
   - Click "Aceptar"
   - ✅ La tarjeta vuelve a estado "Libre"
   - ✅ Botón vuelve a ser "Desplegar Rama"
   - ✅ Notificación snackbar
   - ✅ Mensaje en Slack

6. **Probar con test4:**
   - Repite los pasos 3-5 con test4
   - Usa otro nombre de rama

7. **Prueba de actualización:**
   - Despliega en dev4
   - En otra pestaña/navegador, libera dev4 usando curl o Thunder Client
   - En la primera pestaña, click en botón "Actualizar"
   - ✅ Debe mostrar el estado actualizado

8. **Prueba responsive:**
   - Abre DevTools (F12)
   - Cambia a vista móvil
   - ✅ Las tarjetas deben apilarse verticalmente
   - ✅ Todo debe ser legible y funcional

## 🔧 Pruebas con Thunder Client

1. **Instala Thunder Client:**
   - En VS Code, busca extensión "Thunder Client"
   - Instala

2. **Importa la colección:**
   - Click en Thunder Client en la barra lateral
   - Click en "Collections"
   - Importa `thunder-collection.json`

3. **Ejecuta las pruebas:**
   - Ejecuta cada request en orden
   - Verifica las respuestas

## 🐛 Casos de Error a Probar

### Backend

1. **MongoDB desconectado:**
   - Deten MongoDB o usa credenciales incorrectas
   - Intenta hacer request
   - ✅ Debe retornar error 500

2. **Slack webhook inválido:**
   - Usa URL incorrecta en `.env`
   - Despliega ambiente
   - ✅ Debe funcionar pero solo logear warning

3. **Datos inválidos:**
   ```bash
   curl -X POST http://localhost:3000/api/environments/dev4/deploy \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   - ✅ Debe retornar error 400

### Frontend

1. **Backend caído:**
   - Deten el backend
   - Intenta usar la aplicación
   - ✅ Debe mostrar errores en snackbar

2. **Datos vacíos en formulario:**
   - Abre diálogo de despliegue
   - No ingreses datos
   - ✅ Botón "Desplegar" debe estar deshabilitado

## 📊 Checklist de Pruebas

- [ ] Health check funciona
- [ ] Inicialización crea ambientes
- [ ] GET ambientes retorna lista correcta
- [ ] POST deploy ocupa ambiente correctamente
- [ ] POST deploy envía notificación a Slack
- [ ] POST deploy rechaza ambiente ya ocupado
- [ ] POST release libera ambiente
- [ ] POST release envía notificación a Slack
- [ ] Frontend muestra ambientes correctamente
- [ ] Frontend permite desplegar
- [ ] Frontend permite liberar
- [ ] Frontend muestra notificaciones
- [ ] Frontend es responsive
- [ ] Validaciones de formulario funcionan
- [ ] Manejo de errores funciona

## 🎯 Escenarios de Usuario Real

### Escenario 1: Developer despliega feature
1. Developer abre app
2. Ve que dev4 está libre
3. Despliega su rama feature/ABC-123
4. Equipo recibe notificación en Slack
5. Trabaja en el ambiente
6. QA prueba y libera

### Escenario 2: Conflicto evitado
1. Dev A ve que test4 está ocupado
2. Ve que Dev B tiene rama integration/sprint-5
3. No despliega y pregunta a Dev B cuándo estará libre
4. Se evita sobrescribir el ambiente

### Escenario 3: QA libera ambiente
1. QA termina de probar
2. Abre app
3. Click en "Liberar Ambiente"
4. Equipo recibe notificación
5. Desarrolladores saben que está disponible

---

¡Prueba todos estos escenarios para asegurar que todo funciona correctamente! 🚀
