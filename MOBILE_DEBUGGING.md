# 🔍 Cómo Ver la Consola en el Celular

## Método 1: Chrome DevTools Remoto (Recomendado)

### Pasos:

1. **En tu computadora:**
   - Abre Chrome
   - Ve a `chrome://inspect` o `chrome://inspect/#devices`
   - Asegúrate de que "Discover network targets" esté marcado

2. **En tu celular (Android):**
   - Abre Chrome
   - Ve a Configuración > Herramientas para desarrolladores
   - Activa "Depuración USB"
   - Conecta el celular a la computadora con USB
   - Acepta el diálogo de depuración USB en el celular

3. **En tu celular (iPhone/iOS):**
   - Ve a Configuración > Safari > Avanzado
   - Activa "Inspección Web"
   - Conecta el iPhone a la Mac con USB
   - En la Mac, abre Safari > Preferencias > Avanzado
   - Marca "Mostrar menú de desarrollo en la barra de menú"

4. **Ver la consola:**
   - En Chrome (computadora), verás tu dispositivo listado
   - Haz clic en "inspect" junto a la pestaña de tu app
   - Se abrirá una ventana de DevTools con la consola

## Método 2: Eruda (Consola en el navegador móvil)

Si no puedes usar USB, puedes agregar Eruda temporalmente:

1. Agrega esto en `client/index.html` (antes del cierre de `</body>`):
```html
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```

2. Recarga la página en el celular
3. Verás un ícono flotante que abre la consola

## Método 3: Alertas y Logs Visuales

Para debugging rápido, puedes usar `alert()` o mostrar errores en la UI:

```javascript
try {
  // tu código
} catch (error) {
  alert(`Error: ${error.message}`);
  console.error(error);
}
```

## 📱 Acceso desde el Celular

1. Asegúrate de que tu computadora y celular estén en la misma red WiFi
2. Encuentra la IP de tu computadora:
   - Windows: `ipconfig` (busca "IPv4")
   - Mac/Linux: `ifconfig` o `ip addr`
3. En el celular, abre el navegador y ve a:
   ```
   http://[TU_IP]:4040
   ```
   Ejemplo: `http://192.168.1.35:4040`

## ✅ Cambios Realizados

- ✅ La API ahora detecta automáticamente si estás en localhost o en una IP de red local
- ✅ Si accedes desde el celular (IP local), la API usará esa misma IP para conectarse al backend
- ✅ CORS actualizado para permitir conexiones desde IPs de red local
- ✅ Backend escuchando en todas las interfaces (0.0.0.0)

## 🐛 Si Aún Hay Problemas

1. **Verifica el firewall de Windows:**
   - Permite conexiones en los puertos 3000 y 4040

2. **Verifica que ambos servicios estén corriendo:**
   ```powershell
   netstat -ano | findstr ":3000 :4040"
   ```

3. **Revisa la consola del navegador en el celular** (usando uno de los métodos arriba)

4. **Verifica que la IP sea correcta:**
   - La IP debe ser la de tu computadora, no la del celular

