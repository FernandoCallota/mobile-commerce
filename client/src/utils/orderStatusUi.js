/** Etiquetas para la UI (incluye valores legacy por si hay datos viejos). */
export const STATUS_LABEL = {
    solicitado: 'Solicitado',
    confirmado: 'Confirmado',
    preparado: 'Preparado',
    enviado: 'Enviado',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
    pending: 'Solicitado',
    payment_review: 'Solicitado',
    processing: 'Preparado',
    dispatched: 'Enviado',
    delivered: 'Entregado',
    completed: 'Entregado',
}

const LEGACY_MAP = {
    pending: 'solicitado',
    payment_review: 'solicitado',
    processing: 'preparado',
    dispatched: 'enviado',
    delivered: 'entregado',
    completed: 'entregado',
}

export function normalizeOrderStatusUi(s) {
    const x = String(s || '').toLowerCase().trim()
    return LEGACY_MAP[x] || x
}

export const ACTOR_LABEL = {
    admin: 'Administración',
    client: 'Cliente',
    system: 'Sistema',
}

/** Siguientes estados que el admin puede asignar (misma lógica que el servidor). Entregado: solo cliente o auto 24 h. */
export const ADMIN_NEXT_STATUSES = {
    solicitado: ['confirmado', 'cancelado'],
    confirmado: ['preparado', 'cancelado'],
    preparado: ['enviado', 'cancelado'],
    enviado: [],
    entregado: [],
    cancelado: [],
}

export const CANCEL_WINDOW_MS = 60 * 60 * 1000

/** Clases CSS para badge de estado (compartido admin / cliente). */
export function orderStatusBadgeClass(st) {
    const s = String(st || '').toLowerCase()
    if (s === 'solicitado' || s === 'pending' || s === 'payment_review') {
        return 'admin-order-badge admin-order-badge--solicitado'
    }
    if (s === 'confirmado') return 'admin-order-badge admin-order-badge--confirmado'
    if (s === 'preparado' || s === 'processing') return 'admin-order-badge admin-order-badge--preparado'
    if (s === 'enviado' || s === 'dispatched') return 'admin-order-badge admin-order-badge--enviado'
    if (s === 'entregado' || s === 'delivered' || s === 'completed') return 'admin-order-badge admin-order-badge--entregado'
    if (s === 'cancelado') return 'admin-order-badge admin-order-badge--cancelado'
    return 'admin-order-badge'
}

/** Texto del botón de acción del admin (más claro que solo el nombre del estado). */
export const ADMIN_ACTION_LABEL = {
    confirmado: 'Confirmar pago',
    preparado: 'Marcar preparado',
    enviado: 'Marcar enviado',
    cancelado: 'Cancelar pedido',
}
