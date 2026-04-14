import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ClipboardList,
    Loader2,
    ExternalLink,
    RefreshCw,
    Eye,
    X,
    Info,
    Package,
    Truck,
    CheckCircle2,
    Search,
} from 'lucide-react'
import { displayImageUrl } from '../services/api'
import { orderAPI } from '../services/orderAPI'
import {
    STATUS_LABEL,
    normalizeOrderStatusUi,
    ACTOR_LABEL,
    CANCEL_WINDOW_MS,
    orderStatusBadgeClass,
} from '../utils/orderStatusUi'
import { formatDeliveryZoneLine } from '../utils/deliveryZones.js'
import { ORDERS_PAGE_SIZE } from '../utils/paginationConstants.js'
import PaginationBar from './PaginationBar.jsx'

const methodLabel = (m) => (m === 'yape' ? 'Yape' : m === 'cash' ? 'Efectivo' : m || '—')

function MyOrderModalBody({ order }) {
    const lines = order.items || []
    const history = (order.statusHistory || []).slice().reverse()
    const rawSt = order.status || 'solicitado'
    const st = normalizeOrderStatusUi(rawSt)

    return (
        <>
            <div className="my-order-modal-highlight">
                <span className={orderStatusBadgeClass(rawSt)}>{STATUS_LABEL[rawSt] || STATUS_LABEL[st] || st}</span>
                {order.deliveryZoneId && (
                    <p className="my-order-modal-highlight-text" style={{ marginTop: '10px' }}>
                        <strong>Entrega:</strong> {formatDeliveryZoneLine(order.deliveryZoneId, order.shippingFee)}
                    </p>
                )}
                {order.enviadoAt && (
                    <p className="my-order-modal-highlight-text">
                        <Truck size={16} aria-hidden /> Enviado el {new Date(order.enviadoAt).toLocaleString()}
                    </p>
                )}
                {order.entregadoAt && (
                    <p className="my-order-modal-highlight-text">
                        <CheckCircle2 size={16} aria-hidden /> Entregado el {new Date(order.entregadoAt).toLocaleString()}
                    </p>
                )}
            </div>

            {order.shippingAddress && (
                <div className="my-order-modal-block">
                    <h4 className="admin-order-detail-h">Dirección / referencia</h4>
                    <p className="admin-order-detail-p">{order.shippingAddress}</p>
                </div>
            )}

            {order.customerNotes && (
                <p className="admin-order-detail-note">
                    <span>Tu nota</span> {order.customerNotes}
                </p>
            )}

            {order.paymentMethod === 'yape' && order.paymentProofUrl && (
                <div className="admin-order-yape">
                    <a
                        href={displayImageUrl(order.paymentProofUrl) || order.paymentProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-order-yape-link"
                    >
                        <ExternalLink size={16} aria-hidden />
                        Ver comprobante
                    </a>
                    <div className="admin-order-yape-thumb">
                        <img src={displayImageUrl(order.paymentProofUrl) || order.paymentProofUrl} alt="Comprobante" />
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

export default function MyOrders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actingId, setActingId] = useState(null)
    const [detailModalId, setDetailModalId] = useState(null)
    const [ordersPage, setOrdersPage] = useState(1)
    const [ordersSearch, setOrdersSearch] = useState('')

    const filteredOrders = useMemo(() => {
        const q = ordersSearch.trim().toLowerCase()
        if (!q) return orders
        return orders.filter((o) => {
            const idStr = String(o.id)
            const st = normalizeOrderStatusUi(o.status)
            const stLabel = (STATUS_LABEL[o.status] || STATUS_LABEL[st] || st || '').toLowerCase()
            const totalStr = o.total != null ? String(o.total) : ''
            return (
                idStr.includes(q) ||
                stLabel.includes(q) ||
                totalStr.includes(q) ||
                (o.paymentMethod && String(o.paymentMethod).toLowerCase().includes(q))
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
            const list = await orderAPI.listMine()
            setOrders(Array.isArray(list) ? list : [])
        } catch (e) {
            setError(e.message || 'No se pudieron cargar los pedidos')
            setOrders([])
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
            if (actingId != null) return
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
    }, [detailModalId, actingId, load])

    useEffect(() => {
        setOrdersPage(1)
    }, [ordersSearch])

    useEffect(() => {
        setOrdersPage((p) => Math.min(p, ordersTotalPages))
    }, [ordersTotalPages])

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

    const canCancel = (order) => {
        const st = normalizeOrderStatusUi(order.status)
        if (st !== 'solicitado') return false
        return Date.now() - new Date(order.createdAt).getTime() <= CANCEL_WINDOW_MS
    }

    const canConfirmDelivery = (order) => normalizeOrderStatusUi(order.status) === 'enviado'

    const handleCancel = async (id) => {
        if (!window.confirm('¿Cancelar este pedido? Solo puedes hacerlo en la primera hora y en estado Solicitado.')) return
        setActingId(id)
        try {
            const updated = await orderAPI.cancel(id)
            setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
        } catch (e) {
            alert(e.message || 'No se pudo cancelar')
        } finally {
            setActingId(null)
        }
    }

    const handleConfirmDelivery = async (id) => {
        setActingId(id)
        try {
            const updated = await orderAPI.confirmDelivery(id)
            setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
            setDetailModalId(null)
        } catch (e) {
            alert(e.message || 'No se pudo confirmar')
        } finally {
            setActingId(null)
        }
    }

    const modalOrder = detailModalId != null ? orders.find((o) => o.id === detailModalId) : null

    return (
        <motion.div key="my-orders" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <div className="my-orders-header">
                <h2 className="my-orders-title">
                    <ClipboardList size={28} aria-hidden />
                    Mis pedidos
                </h2>
                <button
                    type="button"
                    className="btn-primary my-orders-refresh"
                    onClick={load}
                    disabled={loading}
                >
                    <RefreshCw size={18} aria-hidden className={loading ? 'checkout-spin' : ''} />
                    Actualizar
                </button>
            </div>

            <div className="my-orders-hint glass" role="note">
                <Info size={20} className="my-orders-hint-icon" aria-hidden />
                <p>
                    <strong>Cancelar:</strong> solo en <strong>Solicitado</strong> durante la primera hora.{' '}
                    <strong>Entrega:</strong> cuando esté <strong>Enviado</strong>, confirma que recibiste; si no, a las <strong>24 h</strong> se
                    marcará solo.
                </p>
            </div>

            {loading && orders.length === 0 ? (
                <div className="glass glass-card my-orders-loading">
                    <Loader2 size={28} aria-hidden className="checkout-spin" />
                    <p>Cargando pedidos…</p>
                </div>
            ) : (
                <>
                    {error && <div className="glass glass-card my-orders-error">{error}</div>}
                    {!error && orders.length === 0 && (
                        <div className="glass glass-card my-orders-empty">
                            <Package size={40} strokeWidth={1.25} stroke="var(--text-muted)" aria-hidden />
                            <p>Aún no tienes pedidos.</p>
                            <p className="my-orders-empty-sub">Cuando compres, podrás seguirlos aquí.</p>
                        </div>
                    )}
                    {orders.length > 0 && (
                        <>
                            <label className="catalog-search-label" htmlFor="my-orders-search">
                                <Search size={18} aria-hidden />
                                Buscar pedidos
                            </label>
                            <input
                                id="my-orders-search"
                                type="search"
                                className="catalog-search-input"
                                placeholder="Nº de pedido, estado, total…"
                                value={ordersSearch}
                                onChange={(e) => setOrdersSearch(e.target.value)}
                                autoComplete="off"
                            />

                            {filteredOrders.length === 0 ? (
                                <div className="glass glass-card my-orders-empty">
                                    <p>No hay pedidos que coincidan con tu búsqueda.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="my-orders-list">
                                        {ordersPageSlice.map((order) => {
                                const rawSt = order.status || 'solicitado'
                                const st = normalizeOrderStatusUi(rawSt)
                                const lines = order.items || []
                                const lineCount = lines.length
                                const qtySum = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0)
                                const busy = actingId === order.id

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
                                                    {lineCount} {lineCount === 1 ? 'producto' : 'productos'} ({qtySum} uds.)
                                                </p>
                                                {order.deliveryZoneId && (
                                                    <p className="my-order-zone-chip">{formatDeliveryZoneLine(order.deliveryZoneId, order.shippingFee)}</p>
                                                )}
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

                                        <div className="my-order-actions-bar">
                                            {canCancel(order) && (
                                                <button
                                                    type="button"
                                                    className="my-order-btn my-order-btn--cancel"
                                                    disabled={busy}
                                                    onClick={() => handleCancel(order.id)}
                                                >
                                                    Cancelar (1 h)
                                                </button>
                                            )}
                                            {canConfirmDelivery(order) && (
                                                <button
                                                    type="button"
                                                    className="my-order-btn my-order-btn--confirm"
                                                    disabled={busy}
                                                    onClick={() => handleConfirmDelivery(order.id)}
                                                >
                                                    {busy ? (
                                                        <>
                                                            <Loader2 size={18} className="checkout-spin" aria-hidden />
                                                            Confirmando…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle2 size={18} aria-hidden />
                                                            Confirmé que recibí
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                            {!canCancel(order) && !canConfirmDelivery(order) && (
                                                <p className="my-order-actions-idle">
                                                    {st === 'entregado' && 'Pedido entregado. ¡Gracias por tu compra!'}
                                                    {st === 'cancelado' && 'Este pedido fue cancelado.'}
                                                    {st !== 'entregado' && st !== 'cancelado' && 'Seguimos tu pedido; te avisamos cuando cambie el estado.'}
                                                </p>
                                            )}
                                        </div>
                                    </article>
                                )
                                        })}
                                    </div>
                                    <PaginationBar
                                        page={ordersPageSafe}
                                        totalPages={ordersTotalPages}
                                        onPageChange={setOrdersPage}
                                    />
                                </>
                            )}
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
                            aria-label="Cerrar detalle"
                            onClick={() => setDetailModalId(null)}
                        />
                        <motion.div
                            className={`admin-order-modal-panel glass${canConfirmDelivery(modalOrder) ? ' admin-order-modal-panel--with-footer' : ''}`}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="my-order-modal-title"
                            initial={{ opacity: 0, scale: 0.94, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 16 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="admin-order-modal-head">
                                <div>
                                    <h2 id="my-order-modal-title" className="admin-order-modal-title">
                                        Pedido #{modalOrder.id}
                                    </h2>
                                    <p className="admin-order-modal-sub">
                                        {new Date(modalOrder.createdAt).toLocaleString()} · Total S/ {parseFloat(modalOrder.total).toFixed(2)} ·{' '}
                                        {methodLabel(modalOrder.paymentMethod)}
                                    </p>
                                </div>
                                <button type="button" className="product-detail-close" onClick={() => setDetailModalId(null)} aria-label="Cerrar">
                                    <X size={22} />
                                </button>
                            </div>
                            <div className="admin-order-modal-body">
                                <MyOrderModalBody order={modalOrder} />
                            </div>
                            {canConfirmDelivery(modalOrder) && (
                                <div className="my-order-modal-footer">
                                    <button
                                        type="button"
                                        className="my-order-btn my-order-btn--confirm my-order-btn--block"
                                        disabled={actingId === modalOrder.id}
                                        onClick={() => handleConfirmDelivery(modalOrder.id)}
                                    >
                                        {actingId === modalOrder.id ? (
                                            <Loader2 size={20} className="checkout-spin" />
                                        ) : (
                                            <CheckCircle2 size={20} aria-hidden />
                                        )}
                                        Confirmar que recibí el pedido
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}
