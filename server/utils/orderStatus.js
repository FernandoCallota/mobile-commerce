/** Estados vigentes del pedido */
export const ORDER_STATUSES = [
    'solicitado',
    'confirmado',
    'preparado',
    'enviado',
    'entregado',
    'cancelado',
];

/** Mapeo legacy → nuevo (BD antigua) */
export const LEGACY_TO_NEW_STATUS = {
    pending: 'solicitado',
    payment_review: 'solicitado',
    processing: 'preparado',
    dispatched: 'enviado',
    delivered: 'entregado',
    completed: 'entregado',
};

export function normalizeOrderStatus(s) {
    const x = String(s || '').toLowerCase().trim();
    return LEGACY_TO_NEW_STATUS[x] || x;
}

/** Transiciones permitidas para el administrador (entregado solo cliente o sistema a las 24 h tras enviado). */
export const ADMIN_ALLOWED_TRANSITIONS = {
    solicitado: ['confirmado', 'cancelado'],
    confirmado: ['preparado', 'cancelado'],
    preparado: ['enviado', 'cancelado'],
    enviado: [],
    entregado: [],
    cancelado: [],
};

export const CANCEL_WINDOW_MS = 60 * 60 * 1000; // 1 hora
export const AUTO_ENTREGADO_AFTER_MS = 24 * 60 * 60 * 1000; // 24 horas tras enviado
