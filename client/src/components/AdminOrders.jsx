import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ClipboardList,
    RefreshCw,
    ExternalLink,
    Eye,
    ChevronRight,
    Package,
    Truck,
    BadgeCheck,
    XCircle,
    Loader2,
    X,
    Search,
} from 'lucide-react'
import { adminAPI } from '../services/adminAPI'
import { displayImageUrl } from '../services/api'
import {
    STATUS_LABEL,
    normalizeOrderStatusUi,
    ADMIN_NEXT_STATUSES,
    ACTOR_LABEL,
    ADMIN_ACTION_LABEL,
    orderStatusBadgeClass,
} from '../utils/orderStatusUi'
import { formatDeliveryZoneLine } from '../utils/deliveryZones.js'
import { ORDERS_PAGE_SIZE } from '../utils/paginationConstants.js'
import PaginationBar from './PaginationBar.jsx'

const methodLabel = (m) => (m === 'yape' ? 'Yape' : m === 'cash' ? 'Efectivo' : m || '—')

const actionIcon = (opt) => {
    const o = {
        confirmado: BadgeCheck,
        preparado: Package,
        enviado: Truck,
        cancelado: XCircle,
    }[opt]
    const Icon = o || ChevronRight
    return <Icon size={18} aria-hidden />
}

const actionBtnClass = (opt) => {
    if (opt === 'cancelado') return 'admin-order-act admin-order-act--danger'
    if (opt === 'confirmado') return 'admin-order-act admin-order-act--confirm'
    if (opt === 'preparado') return 'admin-order-act admin-order-act--prep'
    if (opt === 'enviado') return 'admin-order-act admin-order-act--ship'
    return 'admin-order-act'
}

function AdminOrderModalBody({ order }) {
    const u = order.user
    const name = u ? `${u.names || ''} ${u.surnames || ''}`.trim() : 'Cliente'
    const lines = order.items || []
    const history = (order.statusHistory || []).slice().reverse()

    return (
        <>
            <div className="admin-order-detail-grid">
                <div>
                    <h4 className="admin-order-detail-h">Cliente</h4>
                    <p className="admin-order-detail-p">
                        <strong>{name}</strong>
                    </p>
                    {u?.email && <p className="admin-order-detail-p muted">{u.email}</p>}
                    {u?.phone && <p className="admin-order-detail-p muted">Tel: {u.phone}</p>}
                </div>
                <div>
                    <h4 className="admin-order-detail-h">Entrega</h4>
                    {order.deliveryZoneId && (
                        <p className="admin-order-detail-p" style={{ marginBottom: '8px' }}>
                            <strong>Zona:</strong> {formatDeliveryZoneLine(order.deliveryZoneId, order.shippingFee)}
                        </p>
                    )}
                    {order.shippingAddress ? (
                        <p className="admin-order-detail-p">{order.shippingAddress}</p>
                    ) : (
                        <p className="admin-order-detail-p muted">Sin dirección de entrega</p>
                    )}
                    {order.customerNotes && (
                        <p className="admin-order-detail-note">
                            <span>Nota del cliente:</span> {order.customerNotes}
                        </p>
                    )}
                </div>
            </div>

            {order.paymentMethod === 'yape' && order.paymentProofUrl && (
                <div className="admin-order-yape">
                    <a
                        href={displayImageUrl(order.paymentProofUrl) || order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-order-yape-link"
                    >
                        <ExternalLink size={16} aria-hidden />
                        Abrir comprobante en nueva pestaña
                    </a>
                    <div className="admin-order-yape-thumb">
                        <img src={displayImageUrl(order.paymentProofUrl) || order.paymentProofUrl} alt="Comprobante Yape" />
                    </div>
                </div>
            )}

            <div>
                <h4 className="admin-order-detail-h">Productos</h4>
                <ul className="admin-order-lines">
                    {lines.map((line) => (
                        <li key={line.id}>
                            <span className="admin-order-line-name">{line.product?.name || `Producto #${line.productId}`}</span>
                            <span className="admin-order-line-qty">× {line.quantity}</span>
                            <span className="admin-order-line-price">S/ {(parseFloat(line.price) * line.quantity).toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {(order.enviadoAt || order.entregadoAt) && (
                <div className="admin-order-dates">
                    {order.enviadoAt && (
                        <span>
                            <strong>Enviado:</strong> {new Date(order.enviadoAt).toLocaleString()}
                        </span>
                    )}
                    {order.entregadoAt && (
                        <span>
                            <strong>Entregado:</strong> {new Date(order.entregadoAt).toLocaleString()}
                        </span>
                    )}
                </div>
            )}

            {history.length > 0 && (
                <div className="admin-order-history">
                    <h4 className="admin-order-detail-h">Historial</h4>
                    <ul className="admin-order-history-list">
                        {history.map((row) => (
                            <li key={row.id}>
                                <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString()}</time>
                                <span className="admin-order-history-arrow">→</span>
                                <span>{STATUS_LABEL[row.newStatus] || row.newStatus}</span>
                                <span className="admin-order-history-actor">({ACTOR_LABEL[row.actor] || row.actor})</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    )
}

export default function AdminOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [updatingId, setUpdatingId] = useState(null)
    /** Pedido cuyo detalle se muestra en modal (null = cerrado) */
    const [detailModalId, setDetailModalId] = useState(null)
    const [ordersPage, setOrdersPage] = useState(1)
    const [ordersSearch, setOrdersSearch] = useState('')

    const filteredOrders = useMemo(() => {
        const q = ordersSearch.trim().toLowerCase()
        if (!q) return orders
        return orders.filter((o) => {
            const u = o.user
            const name = u ? `${u.names || ''} ${u.surnames || ''}`.trim().toLowerCase() : ''
            const email = (u?.email || '').toLowerCase()
            const phone = (u?.phone || '').replace(/\s/g, '').toLowerCase()
            const rawSt = o.status || 'solicitado'
            const st = normalizeOrderStatusUi(rawSt)
            const stLabel = (STATUS_LABEL[rawSt] || STATUS_LABEL[st] || st || '').toLowerCase()
            const idStr = String(o.id)
            const totalStr = o.total != null ? String(o.total) : ''
            const qCompact = q.replace(/\s/g, '')
            return (
                idStr.includes(q) ||
                name.includes(q) ||
                email.includes(q) ||
                (phone && (phone.includes(qCompact) || phone.includes(q))) ||
                stLabel.includes(q) ||
                totalStr.includes(q)
            )
        })
    }, [orders, ordersSearch])

    const ordersTotalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PAGE_SIZE))
    const ordersPageSafe = Math.min(Math.max(1, ordersPage), ordersTotalPages)
    const ordersPageSlice = filteredOrders.slice(
        (ordersPageSafe - 1) * ORDERS_PAGE_SIZE,
        ordersPageSafe * ORDERS_PAGE_SIZE
    )

    const load = useCallback(async () => {
        setError('')
        setLoading(true)
        try {
            const data = await adminAPI.getOrders()
            setOrders(data)
        } catch (e) {
            setError(e.message || 'Error al cargar pedidos')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        setOrdersPage(1)
    }, [ordersSearch])

    useEffect(() => {
        setOrdersPage((p) => Math.min(p, ordersTotalPages))
    }, [ordersTotalPages])

    const changeStatus = async (orderId, status) => {
        if (!status) return
        setUpdatingId(orderId)
        try {
            const updated = await adminAPI.updateOrderStatus(orderId, status)
            setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)))
        } catch (e) {
            alert(e.message || 'No se pudo actualizar')
        } finally {
            setUpdatingId(null)
        }
    }

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

    const onActionClick = (orderId, opt) => {
        if (opt === 'cancelado') {
            if (!window.confirm('¿Cancelar este pedido? Esta acción no se puede deshacer desde aquí.')) return
        }
        changeStatus(orderId, opt)
    }

    const modalOrder = detailModalId != null ? orders.find((o) => o.id === detailModalId) : null

    if (loading) {
        return (
            <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Cargando pedidos…</p>
            </div>
        )
    }

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ClipboardList size={28} aria-hidden />
                    Pedidos
                </h2>
                <button type="button" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px' }} onClick={load}>
                    <RefreshCw size={18} aria-hidden />
                    Actualizar
                </button>
            </div>

            {error && (
                <div className="glass glass-card" style={{ marginBottom: '16px', color: 'var(--accent-color)', padding: '14px' }}>
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No hay pedidos registrados.
                </div>
            ) : (
                <>
                    <label className="catalog-search-label" htmlFor="admin-orders-search">
                        <Search size={18} aria-hidden />
                        Buscar pedidos
                    </label>
                    <input
                        id="admin-orders-search"
                        type="search"
                        className="catalog-search-input"
                        placeholder="Nº, cliente, correo, teléfono, estado…"
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                        autoComplete="off"
                    />

                    {filteredOrders.length === 0 ? (
                        <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            No hay pedidos que coincidan con tu búsqueda.
                        </div>
                    ) : (
                        <>
                            <div className="admin-orders-list">
                                {ordersPageSlice.map((order) => {
                        const u = order.user
                        const name = u ? `${u.names || ''} ${u.surnames || ''}`.trim() : 'Cliente'
                        const rawSt = order.status || 'solicitado'
                        const st = normalizeOrderStatusUi(rawSt)
                        const nextOpts = ADMIN_NEXT_STATUSES[st] || []
                        const lines = order.items || []
                        const lineCount = lines.length
                        const qtySum = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)
                        const busy = updatingId === order.id

                        return (
                            <article key={order.id} className="glass glass-card admin-order-card">
                                <div className="admin-order-summary">
                                    <div className="admin-order-summary-main">
                                        <div className="admin-order-id-block">
                                            <span className="admin-order-id">Pedido #{order.id}</span>
                                            <span className={orderStatusBadgeClass(rawSt)}>
                                                {STATUS_LABEL[rawSt] || STATUS_LABEL[st] || st}
                                            </span>
                                        </div>
                                        <p className="admin-order-meta">
                                            {new Date(order.createdAt).toLocaleString()} · {methodLabel(order.paymentMethod)} ·{' '}
                                            {lineCount} {lineCount === 1 ? 'línea' : 'líneas'} ({qtySum} uds.)
                                        </p>
                                        {order.deliveryZoneId && (
                                            <p className="admin-order-zone-line">{formatDeliveryZoneLine(order.deliveryZoneId, order.shippingFee)}</p>
                                        )}
                                        <p className="admin-order-client-name">{name}</p>
                                    </div>
                                    <div className="admin-order-summary-side">
                                        <div className="admin-order-total">S/ {parseFloat(order.total).toFixed(2)}</div>
                                        <button
                                            type="button"
                                            className="admin-order-detail-btn"
                                            onClick={() => setDetailModalId(order.id)}
                                        >
                                            Ver detalles
                                            <Eye size={18} aria-hidden />
                                        </button>
                                    </div>
                                </div>

                                <div className="admin-order-actions-bar">
                                    <span className="admin-order-actions-label">Siguiente paso</span>
                                    <div className="admin-order-actions-row">
                                        {busy && (
                                            <span className="admin-order-updating">
                                                <Loader2 size={18} className="admin-order-spin" aria-hidden />
                                                Actualizando…
                                            </span>
                                        )}
                                        {!busy &&
                                            nextOpts.map((opt) => (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    className={actionBtnClass(opt)}
                                                    disabled={busy}
                                                    onClick={() => onActionClick(order.id, opt)}
                                                >
                                                    {actionIcon(opt)}
                                                    {ADMIN_ACTION_LABEL[opt] || STATUS_LABEL[opt] || opt}
                                                </button>
                                            ))}
                                        {!busy && nextOpts.length === 0 && (
                                            <span className="admin-order-no-actions">
                                                {st === 'enviado'
                                                    ? 'Entrega: la confirma el cliente o el sistema a las 24 h del envío.'
                                                    : 'Sin acciones — estado final'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </article>
                        )
                                })}
                            </div>
                            <PaginationBar page={ordersPageSafe} totalPages={ordersTotalPages} onPageChange={setOrdersPage} />
                        </>
                    )}
                </>
            )}

            <AnimatePresence>
                {modalOrder && (
                    <motion.div
                        key={modalOrder.id}
                        className="admin-order-modal-root"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <button
                            type="button"
                            className="admin-order-modal-backdrop"
                            aria-label="Cerrar detalle del pedido"
                            onClick={() => setDetailModalId(null)}
                        />
                        <motion.div
                            className="admin-order-modal-panel glass"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="admin-order-modal-title"
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 16 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="admin-order-modal-head">
                                <div>
                                    <h2 id="admin-order-modal-title" className="admin-order-modal-title">
                                        Pedido #{modalOrder.id}
                                    </h2>
                                    <p className="admin-order-modal-sub">
                                        {new Date(modalOrder.createdAt).toLocaleString()} · Total S/ {parseFloat(modalOrder.total).toFixed(2)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    className="product-detail-close"
                                    onClick={() => setDetailModalId(null)}
                                    aria-label="Cerrar"
                                >
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="admin-order-modal-body">
                                <AdminOrderModalBody order={modalOrder} />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
