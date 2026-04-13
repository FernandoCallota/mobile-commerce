/**
 * Valida que la URL sea de entrega Cloudinary de ESTE proyecto (anti open-proxy).
 */
function isAllowedCloudinaryUrl(urlString) {
    try {
        const u = new URL(urlString);
        if (u.protocol !== 'https:') return false;
        if (u.hostname !== 'res.cloudinary.com') return false;
        const cloud = process.env.CLOUDINARY_CLOUD_NAME;
        if (!cloud) return false;
        const prefix = `/${cloud}/`;
        if (!u.pathname.startsWith(prefix)) return false;
        if (urlString.includes('@')) return false;
        return true;
    } catch {
        return false;
    }
}

/**
 * Sirve imágenes Cloudinary vía mismo origen para evitar cookies de terceros
 * en el navegador (Lighthouse Best Practices).
 */
export async function proxyCloudinaryImage(req, res) {
    const raw = req.query.url;
    if (!raw || typeof raw !== 'string') {
        return res.status(400).send('Parámetro url requerido');
    }

    let decoded;
    try {
        decoded = decodeURIComponent(raw.trim());
    } catch {
        return res.status(400).send('url inválida');
    }

    if (!isAllowedCloudinaryUrl(decoded)) {
        return res.status(403).send('URL no permitida');
    }

    let upstream;
    try {
        upstream = await fetch(decoded, {
            headers: { 'User-Agent': 'NutrimentosPavio-ImageProxy/1.0' },
            redirect: 'follow',
        });
    } catch (err) {
        console.error('Image proxy fetch error:', err.message);
        return res.status(502).send('Error al obtener la imagen');
    }

    if (!upstream.ok) {
        return res.status(upstream.status === 404 ? 404 : 502).send('Recurso no disponible');
    }

    let buffer;
    try {
        buffer = Buffer.from(await upstream.arrayBuffer());
    } catch (err) {
        console.error('Image proxy buffer error:', err.message);
        return res.status(502).send('Error al obtener la imagen');
    }

    const ct = upstream.headers.get('content-type');
    if (ct && ct.startsWith('image/')) {
        res.setHeader('Content-Type', ct);
    } else {
        res.setHeader('Content-Type', 'application/octet-stream');
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Length', buffer.length);
    return res.status(200).send(buffer);
}
