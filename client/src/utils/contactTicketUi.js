/** Etiquetas y clases de badge para tickets de contacto (quejas / consultas). */

export const TICKET_TYPE_LABEL = {
    QUEJA: 'Queja',
    CONSULTA: 'Consulta',
    OTRO: 'Otro',
}

export const TICKET_STATUS_LABEL = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    respondido: 'Respondido',
    cerrado: 'Cerrado',
}

export function ticketStatusBadgeClass(status) {
    const base = 'contact-ticket-badge'
    const map = {
        pendiente: 'contact-ticket-badge--pendiente',
        en_revision: 'contact-ticket-badge--revision',
        respondido: 'contact-ticket-badge--respondido',
        cerrado: 'contact-ticket-badge--cerrado',
    }
    return `${base} ${map[status] || ''}`.trim()
}
