import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Smartphone, Banknote, Upload, Loader2, ChevronDown } from 'lucide-react'
import { orderAPI } from '../services/orderAPI'
import { displayImageUrl } from '../services/api'
import { DELIVERY_ZONES, getDeliveryZone, getShippingFeeSoles } from '../utils/deliveryZones.js'

/**
 * QR de Yape en checkout — NO se lee la carpeta de Cloudinary por nombre.
 * Opciones:
 * - Local: archivo en client/public/assets/yape-qr.jpeg (ruta web /assets/yape-qr.jpeg).
 * - Cloudinary: en client/.env define VITE_YAPE_QR_URL= con la URL HTTPS completa de la imagen
 *   (copiar desde Media Library → tu QR; puede estar en comprobantes-yape u otra carpeta).
 */
const YAPE_QR_FALLBACK = '/assets/yape-qr.jpeg'

/** Lista plana sin optgroup: los grupos nativos suelen dibujar franjas blancas en el desplegable. */
const FREE_ZONES = DELIVERY_ZONES.filter((z) => z.feeSoles === 0)
const PAID_ZONES = DELIVERY_ZONES.filter((z) => z.feeSoles > 0).sort((a, b) => a.label.localeCompare(b.label, 'es'))
const CHECKOUT_ZONE_OPTIONS = [...FREE_ZONES, ...PAID_ZONES]

export default function CheckoutModal({ open, onClose, cart, total, user, onSuccess }) {
    const [paymentMethod, setPaymentMethod] = useState('cash')
    const [deliveryZoneId, setDeliveryZoneId] = useState('')
    const [shippingAddress, setShippingAddress] = useState(() => user?.address || '')
    const [customerNotes, setCustomerNotes] = useState('')
    const [proofFile, setProofFile] = useState(null)
    const [proofPreview, setProofPreview] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [yapeQrError, setYapeQrError] = useState(false)

    const selectedZone = getDeliveryZone(deliveryZoneId)
    const shippingFee = getShippingFeeSoles(deliveryZoneId)

    const grandTotal = useMemo(() => {
        const sub = Number(total) || 0
        return sub + shippingFee
    }, [total, shippingFee])

    /** URL final del QR (Cloudinary vía proxy si aplica, o archivo local). */
    const yapeQrSrc = useMemo(() => {
        const raw = (import.meta.env.VITE_YAPE_QR_URL || '').trim() || YAPE_QR_FALLBACK
        return displayImageUrl(raw)
    }, [])

    useEffect(() => {
        if (open && user?.address) {
            setShippingAddress((prev) => (prev.trim() === '' ? user.address : prev))
        }
    }, [open, user])

    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [open])

    const reset = () => {
        setPaymentMethod('cash')
        setDeliveryZoneId('')
        setShippingAddress(user?.address || '')
        setCustomerNotes('')
        setProofFile(null)
        setProofPreview(null)
        setSubmitting(false)
        setError('')
        setYapeQrError(false)
    }

    const handleClose = () => {
        if (submitting) return
        reset()
        onClose()
    }

    const onPickProof = (e) => {
        const file = e.target.files?.[0]
        setError('')
        if (!file) {
            setProofFile(null)
            setProofPreview(null)
            return
        }
        if (!file.type.startsWith('image/')) {
            setError('Selecciona una imagen (JPG, PNG, etc.)')
            return
        }
        setProofFile(file)
        setProofPreview(URL.createObjectURL(file))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (cart.length === 0) {
            setError('Tu carrito está vacío')
            return
        }
        if (!deliveryZoneId || !selectedZone) {
            setError('Selecciona cómo quieres recibir tu pedido (zona o tienda).')
            return
        }
        if (selectedZone.requiresAddress && !String(shippingAddress).trim()) {
            setError('Indica la dirección o referencia de entrega.')
            return
        }
        if (paymentMethod === 'yape' && !proofFile) {
            setError('Adjunta la captura o foto de tu pago Yape.')
            return
        }

        setSubmitting(true)
        try {
            let paymentProofUrl = null
            if (paymentMethod === 'yape') {
                const up = await orderAPI.uploadPaymentProof(proofFile)
                paymentProofUrl = up.imageUrl
            }

            const items = cart.map((item) => ({
                productId: item.id,
                quantity: item.quantity,
            }))

            const addr =
                selectedZone.kind === 'pickup'
                    ? String(shippingAddress).trim() || 'Recojo en tienda'
                    : String(shippingAddress).trim()

            await orderAPI.create({
                items,
                deliveryZoneId,
                shippingAddress: addr || undefined,
                customerNotes: customerNotes.trim() || undefined,
                paymentMethod,
                paymentProofUrl,
            })

            if (proofPreview) URL.revokeObjectURL(proofPreview)
            reset()
            onSuccess?.()
            onClose()
            alert('¡Pedido registrado! Te contactaremos para coordinar la entrega.')
        } catch (err) {
            setError(err.message || 'No se pudo completar el pedido')
        } finally {
            setSubmitting(false)
        }
    }

    const showAddressField = selectedZone && selectedZone.requiresAddress

    return (
        <AnimatePresence>
            {open && (
                <div className="checkout-modal-root">
                    <motion.div
                        className="checkout-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        aria-hidden
                    />
                    <motion.div
                        className="checkout-modal-panel glass"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="checkout-title"
                        initial={{ opacity: 0, y: 28 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        onClick={(ev) => ev.stopPropagation()}
                    >
                        <div className="checkout-modal-head">
                            <h2 id="checkout-title" style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                                Finalizar pedido
                            </h2>
                            <button type="button" className="product-detail-close" onClick={handleClose} aria-label="Cerrar">
                                <X size={22} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="checkout-form">
                            <div className="checkout-totals">
                                <div className="checkout-totals-row">
                                    <span>Subtotal productos</span>
                                    <span>S/ {Number(total).toFixed(2)}</span>
                                </div>
                                <div className="checkout-totals-row">
                                    <span>Envío</span>
                                    <span>{shippingFee <= 0 ? 'Gratis' : `S/ ${shippingFee.toFixed(2)}`}</span>
                                </div>
                                <div className="checkout-totals-row">
                                    <span>Total a pagar</span>
                                    <span style={{ color: 'var(--accent-color)' }}>S/ {grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <label className="checkout-label">
                                ¿Cómo recibes tu pedido?
                                <div className="checkout-select-wrap">
                                    <select
                                        className="checkout-select"
                                        value={deliveryZoneId}
                                        onChange={(e) => {
                                            setDeliveryZoneId(e.target.value)
                                            setError('')
                                        }}
                                        required
                                        aria-label="Zona de entrega o retiro"
                                    >
                                        <option value="" disabled>
                                            Selecciona una opción…
                                        </option>
                                        {CHECKOUT_ZONE_OPTIONS.map((z) => (
                                            <option key={z.id} value={z.id}>
                                                {z.feeSoles <= 0 ? `${z.label} · Gratis` : `${z.label} — S/ ${z.feeSoles.toFixed(2)}`}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="checkout-select-chevron" size={20} aria-hidden />
                                </div>
                            </label>

                            {selectedZone?.kind === 'free_camana' && (
                                <p className="checkout-pickup-hint">
                                    Motocarga en Camaná: indica tu <strong>dirección exacta</strong> y referencias para el reparto.
                                </p>
                            )}

                            {selectedZone?.kind === 'pickup' && (
                                <p className="checkout-pickup-hint">
                                    Pasarás a retirar por la tienda; si quieres, deja horario u observaciones abajo.
                                </p>
                            )}

                            {showAddressField && (
                                <label className="checkout-label">
                                    Dirección o referencia de entrega
                                    <textarea
                                        value={shippingAddress}
                                        onChange={(e) => setShippingAddress(e.target.value)}
                                        rows={3}
                                        placeholder="Ej: Jr. Los Pinos 123, referencia frente al mercado…"
                                        className="checkout-input"
                                        required={selectedZone?.requiresAddress}
                                    />
                                </label>
                            )}

                            <label className="checkout-label">
                                Notas (opcional)
                                <input
                                    type="text"
                                    value={customerNotes}
                                    onChange={(e) => setCustomerNotes(e.target.value)}
                                    placeholder="Indicaciones adicionales"
                                    className="checkout-input checkout-input--single"
                                />
                            </label>

                            <p className="checkout-section-title">Forma de pago</p>
                            <div className="checkout-pay-grid">
                                <button
                                    type="button"
                                    className={`checkout-pay-card ${paymentMethod === 'yape' ? 'checkout-pay-card--active' : ''}`}
                                    onClick={() => {
                                        setPaymentMethod('yape')
                                        setYapeQrError(false)
                                        setError('')
                                    }}
                                >
                                    <Smartphone size={28} aria-hidden />
                                    <span>Yape</span>
                                    <small>Sube el comprobante</small>
                                </button>
                                <button
                                    type="button"
                                    className={`checkout-pay-card ${paymentMethod === 'cash' ? 'checkout-pay-card--active' : ''}`}
                                    onClick={() => {
                                        setPaymentMethod('cash')
                                        setProofFile(null)
                                        setProofPreview(null)
                                        setError('')
                                    }}
                                >
                                    <Banknote size={28} aria-hidden />
                                    <span>En efectivo</span>
                                    <small>Pago al recibir</small>
                                </button>
                            </div>

                            {paymentMethod === 'yape' && (
                                <div className="checkout-yape-block">
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 10px' }}>
                                        Escanea y paga <strong>S/ {grandTotal.toFixed(2)}</strong> (incluye envío si aplica). Luego sube la captura del
                                        Yapeo.
                                    </p>
                                    <div className="checkout-yape-qr">
                                        <img
                                            src={yapeQrSrc}
                                            alt="Código para pagar con Yape"
                                            loading="lazy"
                                            onError={() => setYapeQrError(true)}
                                        />
                                        {yapeQrError && (
                                            <p style={{ padding: '16px', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                No se cargó el QR. Pon la imagen en{' '}
                                                <code style={{ fontSize: '0.8rem' }}>client/public/assets/yape-qr.jpeg</code> o en{' '}
                                                <code style={{ fontSize: '0.8rem' }}>client/.env</code> añade{' '}
                                                <code style={{ fontSize: '0.8rem' }}>VITE_YAPE_QR_URL=</code> con la URL HTTPS de Cloudinary
                                                (copiada desde tu imagen en Media Library). Reinicia el servidor de Vite tras cambiar .env.
                                            </p>
                                        )}
                                    </div>
                                    <label className="checkout-proof-btn">
                                        <Upload size={18} aria-hidden />
                                        <span>{proofFile ? proofFile.name : 'Elegir imagen del comprobante'}</span>
                                        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPickProof} />
                                    </label>
                                    {proofPreview && <img src={proofPreview} alt="Vista previa comprobante" className="checkout-proof-preview" />}
                                </div>
                            )}

                            {paymentMethod === 'cash' && (
                                <p className="checkout-cash-hint">
                                    Pagarás en efectivo al repartidor o al retirar en tienda, según la opción elegida.
                                </p>
                            )}

                            {error && (
                                <div className="checkout-error" role="alert">
                                    {error}
                                </div>
                            )}

                            <button type="submit" className="btn-primary checkout-submit" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="checkout-spin" aria-hidden />
                                        Procesando…
                                    </>
                                ) : (
                                    `Confirmar pedido · S/ ${grandTotal.toFixed(2)}`
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
