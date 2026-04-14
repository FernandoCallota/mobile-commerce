import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    MessageSquare,
    Loader2,
    RefreshCw,
    Eye,
    X,
    Search,
    Send,
} from 'lucide-react'
import { adminAPI } from '../services/adminAPI'
import { TICKET_TYPE_LABEL, TICKET_STATUS_LABEL, ticketStatusBadgeClass } from '../utils/contactTicketUi'
import { ORDERS_PAGE_SIZE } from '../utils/paginationConstants.js'
import PaginationBar from './PaginationBar.jsx'

const STATUS_FILTER = [
    { value: 'todos', label: 'Todos' },
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_revision', label: 'En revisión' },
    { value: 'respondido', label: 'Respondido' },
    { value: 'cerrado', label: 'Cerrado' },
]

function clientLabel(ticket) {
    if (ticket.user) {
        const u = ticket.user
        const name = `${u.names || ''} ${u.surnames || ''}`.trim()
        return name || u.email || `Usuario #${u.id}`
    }
    if (ticket.guestName || ticket.guestEmail) {
        return `${ticket.guestName || '—'} · ${ticket.guestEmail || ''}`
    }
    return '—'
}

export default function AdminContactTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('todos')
    const [detailId, setDetailId] = useState(null)
    const [saving, setSaving] = useState(false)
    const [draftStatus, setDraftStatus] = useState('pendiente')
    const [draftResponse, setDraftResponse] = useState('')
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')

    const load = useCallback(async () => {
        setError('')
        setLoading(true)
        try {
            const list = await adminAPI.getContactTickets(
                statusFilter === 'todos' ? undefined : { status: statusFilter }
            )
            setTickets(Array.isArray(list) ? list : [])
        } catch (e) {
            setError(e.message || 'No se pudieron cargar los casos')
            setTickets([])
        } finally {
            setLoading(false)
        }
    }, [statusFilter])

    useEffect(() => {
        load()
    }, [load])

    // Auto-refresco (evita F5): mientras está abierto y sin modal de detalle.
    useEffect(() => {
        const tick = async () => {
            if (document.visibilityState !== 'visible') return
            if (detailId != null) return
            await load()
        }
        const id = setInterval(tick, 20000)
        document.addEventListener('visibilitychange', tick)
        window.addEventListener('focus', tick)
        return () => {
            clearInterval(id)
            document.removeEventListener('visibilitychange', tick)
            window.removeEventListener('focus', tick)
        }
    }, [detailId, load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return tickets
        return tickets.filter((t) => {
            const idStr = String(t.id)
            const client = clientLabel(t).toLowerCase()
            const typeLabel = (TICKET_TYPE_LABEL[t.type] || t.type || '').toLowerCase()
            const st = (TICKET_STATUS_LABEL[t.status] || t.status || '').toLowerCase()
            const msg = (t.message || '').toLowerCase()
            return idStr.includes(q) || client.includes(q) || typeLabel.includes(q) || st.includes(q) || msg.includes(q)
        })
    }, [tickets, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE))
    const pageSafe = Math.min(Math.max(1, page), totalPages)
    const slice = filtered.slice((pageSafe - 1) * ORDERS_PAGE_SIZE, pageSafe * ORDERS_PAGE_SIZE)

    useEffect(() => {
        setPage(1)
    }, [search, statusFilter])

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages))
    }, [totalPages])

    const detail = detailId != null ? tickets.find((t) => t.id === detailId) : null

    useEffect(() => {
        if (!detail) return
        setDraftStatus(detail.status || 'pendiente')
        setDraftResponse(detail.adminResponse || '')
    }, [detail])

    useEffect(() => {
        if (detailId == null) return
        const onKey = (e) => {
            if (e.key === 'Escape') setDetailId(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [detailId])

    useEffect(() => {
        if (detailId == null) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [detailId])

    const handleSave = async () => {
        if (!detail) return
        setSaving(true)
        try {
            const body = {
                status: draftStatus,
                adminResponse: draftResponse,
            }
            const updated = await adminAPI.updateContactTicket(detail.id, body)
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setDetailId(null)
        } catch (e) {
            alert(e.message || 'No se pudo guardar')
        } finally {
            setSaving(false)
        }
    }

    return (
        <motion.div key="admin-tickets" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="my-orders-header">
                <h2 className="my-orders-title">
                    <MessageSquare size={28} aria-hidden />
                    Consultas y quejas
                </h2>
                <button type="button" className="btn-primary my-orders-refresh" onClick={load} disabled={loading}>
                    <RefreshCw size={18} aria-hidden className={loading ? 'checkout-spin' : ''} />
                    Actualizar
                </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                <label htmlFor="admin-ticket-status" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Filtrar por estado
                </label>
                <select
                    id="admin-ticket-status"
                    className="catalog-search-input"
                    style={{ maxWidth: '220px' }}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    {STATUS_FILTER.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>

            {loading && tickets.length === 0 ? (
                <div className="glass glass-card my-orders-loading">
                    <Loader2 size={28} aria-hidden className="checkout-spin" />
                    <p>Cargando…</p>
                </div>
            ) : (
                <>
                    {error && <div className="glass glass-card my-orders-error">{error}</div>}
                    {!error && tickets.length === 0 && (
                        <div className="glass glass-card my-orders-empty">
                            <p>No hay casos con este filtro.</p>
                        </div>
                    )}
                    {tickets.length > 0 && (
                        <>
                            <label className="catalog-search-label" htmlFor="admin-tickets-search">
                                <Search size={18} aria-hidden />
                                Buscar
                            </label>
                            <input
                                id="admin-tickets-search"
                                type="search"
                                className="catalog-search-input"
                                placeholder="Nº, cliente, tipo, mensaje…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoComplete="off"
                            />

                            {filtered.length === 0 ? (
                                <div className="glass glass-card my-orders-empty">
                                    <p>No hay resultados.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="my-orders-list">
                                        {slice.map((t) => (
                                            <article key={t.id} className="glass glass-card admin-order-card">
                                                <div className="admin-order-summary">
                                                    <div className="admin-order-summary-main">
                                                        <div className="admin-order-id-block">
                                                            <span className="admin-order-id">Caso #{t.id}</span>
                                                            <span className={ticketStatusBadgeClass(t.status)}>
                                                                {TICKET_STATUS_LABEL[t.status] || t.status}
                                                            </span>
                                                        </div>
                                                        <p className="admin-order-meta">
                                                            {new Date(t.createdAt).toLocaleString()} · {TICKET_TYPE_LABEL[t.type] || t.type}
                                                        </p>
                                                        <p className="admin-order-client-name">{clientLabel(t)}</p>
                                                        <p className="admin-order-meta" style={{ marginTop: '6px' }}>
                                                            {(t.message || '').length > 100 ? `${(t.message || '').slice(0, 100)}…` : t.message}
                                                        </p>
                                                    </div>
                                                    <div className="admin-order-summary-side">
                                                        <button
                                                            type="button"
                                                            className="admin-order-detail-btn"
                                                            onClick={() => setDetailId(t.id)}
                                                        >
                                                            <Eye size={18} aria-hidden />
                                                            Gestionar
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        ))}
                                    </div>
                                    <PaginationBar page={pageSafe} totalPages={totalPages} onPageChange={setPage} />
                                </>
                            )}
                        </>
                    )}
                </>
            )}

            {detail && (
                <div className="admin-order-modal-root" role="dialog" aria-modal="true" aria-labelledby="admin-ticket-modal-title">
                    <div className="admin-order-modal-backdrop" onClick={() => !saving && setDetailId(null)} aria-hidden />
                    <div className="admin-order-modal-panel" style={{ maxWidth: '520px' }}>
                        <div className="admin-order-modal-head">
                            <h3 id="admin-ticket-modal-title" className="admin-order-modal-title">
                                Caso #{detail.id}
                            </h3>
                            <button
                                type="button"
                                className="admin-order-modal-close"
                                onClick={() => !saving && setDetailId(null)}
                                disabled={saving}
                                aria-label="Cerrar"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="admin-order-modal-body">
                            <p className="admin-order-detail-p muted" style={{ marginBottom: '12px' }}>
                                <strong>Cliente:</strong> {clientLabel(detail)}
                                {detail.user?.email && (
                                    <>
                                        <br />
                                        {detail.user.email} · {detail.user.phone || ''}
                                    </>
                                )}
                            </p>
                            {detail.type === 'QUEJA' && detail.order && (
                                <p className="admin-order-detail-p" style={{ marginBottom: '12px' }}>
                                    <strong>Pedido:</strong> #{detail.order.id} ({detail.order.status}) · Total S/ {detail.order.total}
                                </p>
                            )}
                            {detail.order?.shippingAddress && (
                                <p className="admin-order-detail-p muted" style={{ marginBottom: '12px', fontSize: '0.9rem' }}>
                                    Entrega: {detail.order.shippingAddress}
                                </p>
                            )}

                            <h4 className="admin-order-detail-h">Mensaje del cliente</h4>
                            <p className="admin-order-detail-p" style={{ whiteSpace: 'pre-wrap', marginBottom: '16px' }}>
                                {detail.message}
                            </p>

                            <label className="contact-form-label" htmlFor="admin-ticket-status-field">
                                Estado
                            </label>
                            <select
                                id="admin-ticket-status-field"
                                className="contact-form-field"
                                style={{ marginBottom: '12px' }}
                                value={draftStatus}
                                onChange={(e) => setDraftStatus(e.target.value)}
                                disabled={saving}
                            >
                                {STATUS_FILTER.filter((o) => o.value !== 'todos').map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>

                            <label className="contact-form-label" htmlFor="admin-ticket-response">
                                Respuesta al cliente
                            </label>
                            <textarea
                                id="admin-ticket-response"
                                className="contact-form-field contact-form-textarea"
                                rows={6}
                                placeholder="Escribe la respuesta que verá el cliente en su cuenta…"
                                value={draftResponse}
                                onChange={(e) => setDraftResponse(e.target.value)}
                                disabled={saving}
                            />

                            <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
                                <button type="button" className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: '1 1 140px' }}>
                                    <Send size={18} aria-hidden style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    {saving ? 'Guardando…' : 'Guardar'}
                                </button>
                                <button
                                    type="button"
                                    className="glass"
                                    onClick={() => setDetailId(null)}
                                    disabled={saving}
                                    style={{
                                        flex: '1 1 100px',
                                        padding: '12px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
