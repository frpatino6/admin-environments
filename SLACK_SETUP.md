### Pasos para Configurar Slack Webhook

1. **Accede a la API de Slack:**
   - Ve a https://api.slack.com/apps
   - Inicia sesión con tu cuenta de Slack

2. **Crea una Nueva App:**
   - Click en "Create New App"
   - Selecciona "From scratch"
   - Nombre: "Admin Environments Bot"
   - Selecciona tu workspace
   - Click "Create App"

3. **Habilita Incoming Webhooks:**
   - En el menú lateral, click en "Incoming Webhooks"
   - Activa el toggle "Activate Incoming Webhooks"
   
4. **Añade un Webhook:**
   - Scroll hacia abajo
   - Click en "Add New Webhook to Workspace"
   - Selecciona el canal donde quieres recibir notificaciones (ej: #dev-notifications)
   - Click "Allow"

5. **Copia la URL del Webhook:**
   - Verás una URL que empieza con: `https://hooks.slack.com/services/...`
   - Copia esta URL completa

6. **Configura el Backend:**
   - Abre `backend/.env`
   - Reemplaza:
     ```
     SLACK_WEBHOOK_URL=https://hooks.slack.com/services/TU_WEBHOOK_AQUI
     ```
   - Guarda el archivo

7. **Prueba el Webhook:**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
   --data '{"text":"✅ Admin Environments configurado correctamente!"}' \
   https://hooks.slack.com/services/TU_WEBHOOK_AQUI
   ```

8. **Verifica:**
   - Deberías ver el mensaje en tu canal de Slack
   - Si funciona, reinicia el backend y listo!

### Canales Recomendados

- `#dev-notifications` - Para notificaciones de desarrollo
- `#environment-status` - Canal dedicado a estado de ambientes
- `#deployments` - Para todos los despliegues

### Personalización de Mensajes

Puedes modificar los mensajes en:
`backend/services/slackService.js`

```javascript
// Personaliza el emoji, formato, etc
const message = `🚀 *AMBIENTE OCUPADO*\nAmbiente: ${envName}\nRama: ${branch}\nUsuario: ${user}`;
```

### Troubleshooting

**Error: "channel_not_found"**
- El canal fue eliminado o el bot no tiene acceso
- Crea un nuevo webhook para otro canal

**Error: "invalid_token"**
- La URL del webhook es incorrecta
- Verifica que copiaste la URL completa

**No llegan notificaciones:**
- Verifica que el backend está corriendo
- Revisa los logs del backend para ver errores
- Confirma que el `.env` tiene la URL correcta
