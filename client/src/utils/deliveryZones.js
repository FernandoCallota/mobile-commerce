/**
 * Misma lista que el servidor (solo UI). El total con envío lo valida el API.
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
]

const byId = Object.fromEntries(DELIVERY_ZONES.map((z) => [z.id, z]))

export function getDeliveryZone(id) {
    return byId[String(id || '').trim()] || null
}

export function getShippingFeeSoles(id) {
    const z = getDeliveryZone(id)
    return z ? Number(z.feeSoles) : 0
}

/** Texto para resumen de pedido (admin / cliente). */
export function formatDeliveryZoneLine(zoneId, shippingFee) {
    const z = getDeliveryZone(zoneId)
    const label = z ? z.label : zoneId || 'Zona'
    const fee = shippingFee != null ? Number(shippingFee) : z ? z.feeSoles : 0
    return fee > 0 ? `${label} · envío S/ ${fee.toFixed(2)}` : `${label} · sin costo de envío`
}
