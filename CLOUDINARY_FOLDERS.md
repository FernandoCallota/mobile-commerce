# 📁 Estructura de Carpetas en Cloudinary

## Organización

Todas las imágenes se organizan en Cloudinary bajo la carpeta principal `nutrimentos-pavio/` con las siguientes subcarpetas:

```
nutrimentos-pavio/
  ├── products/        → Imágenes de productos
  ├── payments/        → Confirmaciones de Yape/pagos
  ├── orders/          → Comprobantes de pedidos
  └── users/           → Fotos de perfil de usuarios
```

## Uso

### 1. Imágenes de Productos
**Carpeta:** `nutrimentos-pavio/products`

**Cuándo usar:**
- Al crear/editar productos desde el panel de administración
- Se usa automáticamente cuando subes imágenes desde "Gestión de Productos"

**Ejemplo:**
```javascript
// Se usa automáticamente en AdminProducts.jsx
await productAPI.uploadImage(file, 'products');
```

### 2. Confirmaciones de Pago (Yape)
**Carpeta:** `nutrimentos-pavio/payments`

**Cuándo usar:**
- Cuando un cliente sube comprobante de pago
- Confirmaciones de transferencias Yape
- Capturas de pantalla de pagos

**Ejemplo:**
```javascript
// Para subir comprobante de pago
await productAPI.uploadImage(file, 'payments');
```

### 3. Comprobantes de Pedidos
**Carpeta:** `nutrimentos-pavio/orders`

**Cuándo usar:**
- Comprobantes de pedidos completados
- Facturas
- Documentos relacionados con pedidos

**Ejemplo:**
```javascript
// Para subir comprobante de pedido
await productAPI.uploadImage(file, 'orders');
```

### 4. Fotos de Perfil
**Carpeta:** `nutrimentos-pavio/users`

**Cuándo usar:**
- Fotos de perfil de usuarios
- Avatares
- (Si decides implementar esta funcionalidad en el futuro)

**Ejemplo:**
```javascript
// Para subir foto de perfil
await productAPI.uploadImage(file, 'users');
```

## Ventajas de esta Organización

✅ **Fácil de encontrar:** Cada tipo de imagen tiene su lugar  
✅ **Limpieza:** Fácil de limpiar imágenes antiguas por tipo  
✅ **Escalable:** Puedes agregar más tipos de carpetas fácilmente  
✅ **Organización:** Todo está bajo `nutrimentos-pavio/` para mantener tu cuenta organizada  

## Ver Imágenes en Cloudinary

1. Ve a [https://console.cloudinary.com](https://console.cloudinary.com)
2. En el menú lateral, ve a **Media Library**
3. Verás la estructura de carpetas:
   - `nutrimentos-pavio/`
     - `products/`
     - `payments/`
     - `orders/`
     - `users/`

## Notas

- Las carpetas se crean automáticamente cuando subes la primera imagen
- No necesitas crear las carpetas manualmente
- Todas las imágenes se optimizan automáticamente (WebP, compresión)
- Las imágenes se almacenan con nombres únicos para evitar conflictos

