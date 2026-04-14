import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Loader2, RefreshCw, Eye, X, Info, Search } from 'lucide-react'
import { contactTicketAPI } from '../services/contactTicketAPI'
import { TICKET_TYPE_LABEL, TICKET_STATUS_LABEL, ticketStatusBadgeClass } from '../utils/contactTicketUi'
import { ORDERS_PAGE_SIZE } from '../utils/paginationConstants.js'
import PaginationBar from './PaginationBar.jsx'

function TicketModalBody({ ticket }) {
    const order = ticket.order
    return (
        <>
            <div className="my-order-modal-highlight">
                <span className={ticketStatusBadgeClass(ticket.status)}>{TICKET_STATUS_LABEL[ticket.status] || ticket.status}</span>
                <p className="my-order-modal-highlight-text" style={{ marginTop: '10px' }}>
                    <strong>Tipo:</strong> {TICKET_TYPE_LABEL[ticket.type] || ticket.type}
                </p>
                {ticket.type === 'QUEJA' && order && (
                    <p className="my-order-modal-highlight-text">
                        <strong>Pedido:</strong> #{order.id}
                    </p>
                )}
            </div>

            <div className="my-order-modal-block">
                <h4 className="admin-order-detail-h">Tu mensaje</h4>
                <p className="admin-order-detail-p" style={{ whiteSpace: 'pre-wrap' }}>
                    {ticket.message}
                </p>
            </div>

            {ticket.adminResponse && (
                <div className="my-order-modal-block">
                    <h4 className="admin-order-detail-h">Respuesta del equipo</h4>
                    <p className="admin-order-detail-p" style={{ whiteSpace: 'pre-wrap' }}>
                        {ticket.adminResponse}
                    </p>
                    {ticket.respondedAt && (
                        <p className="admin-order-detail-p muted" style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                            {new Date(ticket.respondedAt).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {!ticket.adminResponse && ticket.status !== 'cerrado' && (
                <p className="admin-order-detail-note">
                    <span>Estado</span> Te responderemos pronto; aquí verás la respuesta cuando esté lista.
                </p>
            )}
        </>
    )
}

export default function MyContactTickets() {
    const [tickets, setTickets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [detailModalId, setDetailModalId] = useState(null)
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return tickets
        return tickets.filter((t) => {
            const idStr = String(t.id)
            const typeLabel = (TICKET_TYPE_LABEL[t.type] || t.type || '').toLowerCase()
            const stLabel = (TICKET_STATUS_LABEL[t.status] || t.status || '').toLowerCase()
            const msg = (t.message || '').toLowerCase()
            return idStr.includes(q) || typeLabel.includes(q) || stLabel.includes(q) || msg.includes(q)
        })
    }, [tickets, search])

    const totalPages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE))
    const pageSafe = Math.min(Math.max(1, page), totalPages)
    const slice = filtered.slice((pageSafe - 1) * ORDERS_PAGE_SIZE, pageSafe * ORDERS_PAGE_SIZE)

    const load = useCallback(async () => {
        setError('')
        setLoading(true)
        try {
            const list = await contactTicketAPI.listMine()
            setTickets(Array.isArray(list) ? list : [])
        } catch (e) {
            setError(e.message || 'No se pudieron cargar tus consultas')
            setTickets([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    // Auto-refresco (evita F5): mientras el usuario está en esta pantalla y sin modal abierto.
    useEffect(() => {
        const tick = async () => {
            if (document.visibilityState !== 'visible') return
            if (detailModalId != null) return
            await load()
        }
        const id = setInterval(tick, 10000)
        document.addEventListener('visibilitychange', tick)
        window.addEventListener('focus', tick)
        return () => {
            clearInterval(id)
            document.removeEventListener('visibilitychange', tick)
            window.removeEventListener('focus', tick)
        }
    }, [detailModalId, load])

    useEffect(() => {
        setPage(1)
    }, [search])

    useEffect(() => {
        setPage((p) => Math.min(p, totalPages))
    }, [totalPages])

    useEffect(() => {
        if (detailModalId == null) return
        const onKey = (e) => {
            if (e.key === 'Escape') setDetailModalId(null)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [detailModalId])

    useEffect(() => {
        if (detailModalId == null) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [detailModalId])

    const modalTicket = detailModalId != null ? tickets.find((t) => t.id === detailModalId) : null

    return (
        <motion.div key="my-tickets" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="my-orders-header">
                <h2 className="my-orders-title">
                    <MessageSquare size={28} aria-hidden />
                    Mis consultas y quejas
                </h2>
                <button type="button" className="btn-primary my-orders-refresh" onClick={load} disabled={loading}>
                    <RefreshCw size={18} aria-hidden className={loading ? 'checkout-spin' : ''} />
                    Actualizar
                </button>
            </div>

            <div className="my-orders-hint glass" role="note">
                <Info size={20} className="my-orders-hint-icon" aria-hidden />
                <p>
                    Aquí ves el <strong>estado</strong> de lo que enviaste desde <strong>Contáctenos</strong> (consultas, otros) y las{' '}
                    <strong>quejas</strong> ligadas a tus pedidos. Cuando el equipo responda, lo verás en el detalle.
                </p>
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
                            <MessageSquare size={40} strokeWidth={1.25} stroke="var(--text-muted)" aria-hidden />
                            <p>No tienes casos registrados aún.</p>
                            <p className="my-orders-empty-sub">Usa Contáctenos para enviar una consulta o queja (con sesión iniciada para quejas).</p>
                        </div>
                    )}
                    {tickets.length > 0 && (
                        <>
                            <label className="catalog-search-label" htmlFor="my-tickets-search">
                                <Search size={18} aria-hidden />
                                Buscar
                            </label>
                            <input
                                id="my-tickets-search"
                                type="search"
                                className="catalog-search-input"
                                placeholder="Nº de caso, tipo, estado…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoComplete="off"
                            />

                            {filtered.length === 0 ? (
                                <div className="glass glass-card my-orders-empty">
                                    <p>No hay resultados para tu búsqueda.</p>
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
                                                            {t.type === 'QUEJA' && t.order && ` · Pedido #${t.order.id}`}
                                                        </p>
                                                        <p className="admin-order-client-name" style={{ marginTop: '6px' }}>
                                                            {(t.message || '').length > 120 ? `${(t.message || '').slice(0, 120)}…` : t.message}
                                                        </p>
                                                    </div>
                                                    <div className="admin-order-summary-side">
                                                        <button
                                                            type="button"
                                                            className="admin-order-detail-btn"
                                                            onClick={() => setDetailModalId(t.id)}
                                                        >
                                                            <Eye size={18} aria-hidden />
                                                            Ver
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

            {modalTicket && (
                <div className="admin-order-modal-root" role="dialog" aria-modal="true" aria-labelledby="my-ticket-modal-title">
                    <div className="admin-order-modal-backdrop" onClick={() => setDetailModalId(null)} aria-hidden />
                    <div className="admin-order-modal-panel my-order-modal-panel">
                        <div className="admin-order-modal-head">
                            <h3 id="my-ticket-modal-title" className="admin-order-modal-title">
                                Caso #{modalTicket.id}
                            </h3>
                            <button
                                type="button"
                                className="admin-order-modal-close"
                                onClick={() => setDetailModalId(null)}
                                aria-label="Cerrar"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="admin-order-modal-body">
                            <TicketModalBody ticket={modalTicket} />
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    )
}
