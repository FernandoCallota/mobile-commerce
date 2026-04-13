# Configuración HTTPS para Producción

## Requisitos

Para habilitar HTTPS en producción, necesitas:

1. Certificados SSL válidos (archivos `.pem` o `.crt` y `.key`)
2. Configurar las variables de entorno

## Opciones para obtener certificados SSL

### Opción 1: Let's Encrypt (Recomendado - Gratis)

```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Obtener certificados para tu dominio
sudo certbot certonly --standalone -d tudominio.com -d www.tudominio.com

# Los certificados se guardarán en:
# /etc/letsencrypt/live/tudominio.com/fullchain.pem
# /etc/letsencrypt/live/tudominio.com/privkey.pem
```

### Opción 2: Certificados autofirmados (Solo para desarrollo/testing)

```bash
# Generar certificado autofirmado
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365

# Crear carpeta ssl en el servidor
mkdir server/ssl
mv key.pem server/ssl/
mv cert.pem server/ssl/
```

## Configuración en .env

Agrega estas variables a tu archivo `.env`:

```env
NODE_ENV=production
ENABLE_HTTPS=true
HTTPS_PORT=3443
SSL_KEY_PATH=/ruta/completa/a/key.pem
SSL_CERT_PATH=/ruta/completa/a/cert.pem
```

## Notas Importantes

- **Nunca** subas tus certificados SSL al repositorio Git
- Usa rutas absolutas para `SSL_KEY_PATH` y `SSL_CERT_PATH`
- En producción, considera usar un proxy reverso (Nginx) que maneje HTTPS
- Los certificados de Let's Encrypt expiran cada 90 días, configura renovación automática

## Renovación Automática (Let's Encrypt)

```bash
# Agregar a crontab para renovar automáticamente
sudo crontab -e

# Agregar esta línea (renueva cada mes)
0 0 1 * * certbot renew --quiet && systemctl restart tu-servicio
```

