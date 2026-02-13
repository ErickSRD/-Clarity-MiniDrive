# Configuración para Producción - Ubuntu 24.04 (Sin Docker)

Este repositorio incluye los archivos necesarios para desplegar el sistema nativamente en un servidor Ubuntu 24.04.

## Requisitos Previos
- Servidor Ubuntu 24.04 limpio o con acceso root/sudo.
- Puerto 80 (HTTP) abierto.

## Guía de Instalación Rápida

He creado un script que automatiza la mayoría de los pasos. Sigue estas instrucciones:

1. **Clona el repositorio** en la ruta `/var/www/clarity`:
   ```bash
   sudo mkdir -p /var/www/clarity
   sudo chown $USER:$USER /var/www/clarity
   git clone <url-del-repo> /var/www/clarity
   ```

2. **Ejecuta el script de configuración**:
   ```bash
   cd /var/www/clarity
   bash deploy/setup_ubuntu.sh
   ```

## Detalles de la Configuración Manual

Si prefieres realizar los pasos uno a uno, aquí tienes la explicación:

### 1. Dependencias del Sistema
Se requiere Node.js 20+, Nginx, SQLite3 y PM2.
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx sqlite3

# PM2
sudo npm install -g pm2
```

### 2. Construcción (Build)
- **Backend**: Genera el código JavaScript en la carpeta `dist`.
- **Frontend**: Genera los archivos estáticos optimizados. Es crucial establecer `VITE_API_BASE=/api` para que las peticiones se redirijan correctamente a través de Nginx.

### 3. Gestión del Backend como Servicio (Systemd)
El backend se instala como un servicio del sistema llamado `clarity-backend`. Esto asegura que se inicie automáticamente con el servidor y se reinicie en caso de fallo.

**Comandos útiles:**
```bash
# Ver estado del servicio
sudo systemctl status clarity-backend

# Reiniciar el backend
sudo systemctl restart clarity-backend

# Ver logs en tiempo real
sudo journalctl -u clarity-backend -f

# Detener el servicio
sudo systemctl stop clarity-backend
```

### 4. Servidor Web (Nginx)
Nginx cumple dos funciones:
- Sirve los archivos estáticos del frontend desde `/var/www/clarity/frontend/dist`.
- Actúa como Proxy Inverso para las rutas que comienzan por `/api`, enviándolas al backend en `localhost:4000`.

## Notas de Mantenimiento
- **Logs**: Puedes ver los logs del backend con `pm2 logs clarity-backend`.
- **Base de Datos**: Se encuentra en `backend/data/minidrive.db`. Se recomienda hacer backups periódicos de este archivo.
- **Seguridad**: Para habilitar HTTPS, utiliza Certbot: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`.
