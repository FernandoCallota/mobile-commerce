/**
 * Zonas de entrega. Los montos (soles) solo se aplican aquí en el servidor.
 * Opciones sin costo: Camaná motocarga (dirección exacta) y recojo en tienda.
 */

export const DELIVERY_ZONES = [
    { id: 'camana_motocarga', label: 'Camaná — a domicilio (motocarga)', feeSoles: 0, requiresAddress: true, kind: 'free_camana' },
    { id: 'pickup_tienda', label: 'Recojo en tienda', feeSoles: 0, requiresAddress: false, kind: 'pickup' },
    { id: 'planchada', label: 'Planchada', feeSoles: 10, requiresAddress: true, kind: 'route' },
    { id: 'pescadores', label: 'Pescadores', feeSoles: 10, requiresAddress: true, kind: 'route' },
    { id: 'ocona', label: 'Ocoña', feeSoles: 8, requiresAddress: true, kind: 'route' },
    { id: 'mollendo', label: 'Mollendo', feeSoles: 10, requiresAddress: true, kind: 'route' },
    { id: 'secocha', label: 'Secocha', feeSoles: 7, requiresAddress: true, kind: 'route' },
    { id: 'alto_molino', label: 'Alto Molino', feeSoles: 8, requiresAddress: true, kind: 'route' },
];

const byId = Object.fromEntries(DELIVERY_ZONES.map((z) => [z.id, z]));

export function getDeliveryZone(id) {
    return byId[String(id || '').trim()] || null;
}

export function isValidDeliveryZoneId(id) {
    return !!getDeliveryZone(id);
}

export function getShippingFeeSoles(id) {
    const z = getDeliveryZone(id);
    return z ? Number(z.feeSoles) : null;
}
