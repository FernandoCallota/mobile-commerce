# 📸 Configuración de Cloudinary

## ¿Por qué Cloudinary?

- ✅ **Plan gratuito generoso**: 25 GB almacenamiento, 25 GB ancho de banda/mes
- ✅ **Optimización automática**: Convierte imágenes a WebP, redimensiona, comprime
- ✅ **CDN global**: Carga rápida desde cualquier ubicación
- ✅ **Transformaciones on-the-fly**: Redimensionar, recortar sin procesar
- ✅ **Perfecto para tu caso**: Con solo 3 productos en 3 años, el plan gratuito es más que suficiente

## Pasos para Configurar

### 1. Crear cuenta en Cloudinary

1. Ve a [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Regístrate con tu email (es gratis)
3. Confirma tu email

### 2. Obtener credenciales

Una vez dentro del Dashboard:

1. Ve a **Settings** (Configuración) → **Security** (Seguridad)
2. Copia estos valores:
   - **Cloud Name** (nombre de tu nube)
   - **API Key** (clave de API)
   - **API Secret** (secreto de API) - haz clic en "Reveal" para verlo

### 3. Configurar variables de entorno

Abre el archivo `.env` en la carpeta `server/` y agrega:

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

**Ejemplo:**
```env
CLOUDINARY_CLOUD_NAME=nutrimentos-pavio
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

### 4. Reiniciar el servidor

```bash
cd server
npm run dev
```

## ✅ Listo

Ahora puedes:
- Subir imágenes desde el panel de administración
- Las imágenes se optimizan automáticamente
- Se almacenan en Cloudinary (no ocupan espacio en tu servidor)
- Se cargan rápidamente desde cualquier lugar

## 📊 Uso del Plan Gratuito

Con tu frecuencia de actualización (3 productos en 3 años):
- **Almacenamiento**: ~1-2 MB por producto = ~6-12 MB total (muy por debajo de 25 GB)
- **Ancho de banda**: Con pocos usuarios, muy por debajo de 25 GB/mes

**Conclusión**: El plan gratuito es perfecto para tu caso de uso.

## 🔒 Seguridad

- Las credenciales están en `.env` (no se suben a Git)
- Solo administradores pueden subir imágenes
- Validación de tipo de archivo (solo imágenes)
- Límite de tamaño: 5MB por imagen

## 🐛 Solución de Problemas

### Error: "Invalid API Key"
- Verifica que las credenciales en `.env` sean correctas
- Asegúrate de no tener espacios extra
- Reinicia el servidor después de cambiar `.env`

### Error: "Image upload failed"
- Verifica tu conexión a internet
- Revisa que el archivo sea una imagen válida
- Verifica que el tamaño no supere 5MB

### Las imágenes no se muestran
- Verifica que Cloudinary permita acceso público
- Revisa la consola del navegador para errores de CORS

