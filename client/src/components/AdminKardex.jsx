import { useState, useEffect, useCallback } from 'react'
import { Package, Plus, Search, X, ArrowDownCircle, ArrowUpCircle, Calendar, Filter, TrendingUp, TrendingDown, Trash2, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { kardexAPI } from '../services/kardexAPI'
import { productAPI } from '../services/productAPI'
import { isLowStock, LOW_STOCK_THRESHOLD } from '../utils/stockThreshold.js'
import { notifyInventoryUpdated } from '../utils/inventoryEvents.js'

export default function AdminKardex() {
    const [movements, setMovements] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [filterType, setFilterType] = useState('')
    const [filterProduct, setFilterProduct] = useState('')
    const [filterDate, setFilterDate] = useState('')
    
    const [formData, setFormData] = useState({
        productId: '',
        type: 'entrada',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
    })

    const resetForm = useCallback(() => {
        setFormData({
            productId: '',
            type: 'entrada',
            quantity: '',
            date: new Date().toISOString().split('T')[0],
            description: ''
        })
    }, [])

    useEffect(() => {
        loadData()
    }, [])

    // Cerrar modal con tecla Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showModal) {
                setShowModal(false)
                resetForm()
            }
        }

        if (showModal) {
            window.addEventListener('keydown', handleEscape)
            return () => window.removeEventListener('keydown', handleEscape)
        }
    }, [showModal, resetForm])

    // Cargar datos cuando cambian los filtros
    useEffect(() => {
        loadMovements()
    }, [filterType, filterProduct, filterDate])

    const loadData = async () => {
        try {
            setLoading(true)
            await Promise.all([loadProducts(), loadMovements()])
        } catch (err) {
            setError(err.message || 'Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const loadProducts = async () => {
        try {
            const data = await productAPI.getAll()
            setProducts(data.filter(p => p.isActive))
        } catch (err) {
            console.error('Error al cargar productos:', err)
        }
    }

    const loadMovements = async () => {
        try {
            const filters = {}
            if (filterType) filters.type = filterType
            if (filterProduct) filters.productId = filterProduct
            if (filterDate) filters.date = filterDate

            const data = await kardexAPI.getAll(filters)
            setMovements(data)
            setError('')
        } catch (err) {
            setError(err.message || 'Error al cargar movimientos')
            console.error('Error:', err)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.productId || !formData.quantity) {
            setError('Producto y cantidad son requeridos')
            return
        }

        if (parseInt(formData.quantity) <= 0) {
            setError('La cantidad debe ser mayor a 0')
            return
        }

        try {
            await kardexAPI.create(formData)
            await loadData()
            notifyInventoryUpdated()
            resetForm()
            setShowModal(false)
        } catch (err) {
            setError(err.message || 'Error al registrar movimiento')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este movimiento? El stock será revertido.')) {
            return
        }

        try {
            await kardexAPI.delete(id)
            await loadMovements()
            await loadProducts() // Recargar productos para actualizar stock
            notifyInventoryUpdated()
        } catch (err) {
            setError(err.message || 'Error al eliminar movimiento')
        }
    }

    const handleNewMovement = () => {
        resetForm()
        setShowModal(true)
    }

    const filteredMovements = movements

    const lowStockProducts = products.filter((p) => isLowStock(p.stock))

    // Calcular estadísticas
    const totalEntradas = movements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0)
    const totalSalidas = movements.filter(m => m.type === 'salida').reduce((sum, m) => sum + m.quantity, 0)

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Cargando kardex...</p>
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Kardex de Inventario</h2>
                <button className="btn-primary" onClick={handleNewMovement} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} />
                    Nuevo Movimiento
                </button>
            </div>

            {/* Estadísticas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div className="glass glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: 'rgba(34, 197, 94, 0.2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <TrendingUp size={24} color="#22c55e" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Entradas</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
                            {totalEntradas}
                        </p>
                    </div>
                </div>
                <div className="glass glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '48px', 
                        height: '48px', 
                        borderRadius: '12px', 
                        background: 'rgba(244, 63, 94, 0.2)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        <TrendingDown size={24} color="var(--accent-color)" />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Salidas</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                            {totalSalidas}
                        </p>
                    </div>
                </div>
            </div>

            {lowStockProducts.length > 0 && (
                <div
                    className="glass glass-card"
                    style={{
                        padding: '14px 16px',
                        marginBottom: '20px',
                        borderLeft: '4px solid var(--accent-color)',
                        background: 'rgba(244, 63, 94, 0.12)',
                    }}
                    role="status"
                    aria-live="polite"
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <AlertTriangle size={22} color="var(--accent-color)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
                        <div>
                            <strong style={{ color: 'var(--text-color)', fontSize: '0.95rem' }}>
                                Alerta de stock: {lowStockProducts.length} producto(s) con menos de {LOW_STOCK_THRESHOLD} unidades
                            </strong>
                            <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {lowStockProducts
                                    .slice(0, 12)
                                    .map((p) => `${p.name} (${p.stock ?? 0})`)
                                    .join(' · ')}
                                {lowStockProducts.length > 12 ? ` · y ${lowStockProducts.length - 12} más…` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="glass glass-card" style={{ 
                    padding: '12px', 
                    marginBottom: '20px',
                    background: 'rgba(244, 63, 94, 0.2)', 
                    color: 'var(--accent-color)' 
                }}>
                    {error}
                </div>
            )}

            {/* Filtros */}
            <div className="glass glass-card" style={{ padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Filter size={18} color="var(--primary-color)" />
                    <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-color)' }}>Filtros</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Tipo
                        </label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            style={{ 
                                width: '100%',
                                padding: '10px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                background: 'rgba(255,255,255,0.1)', 
                                color: '#fff',
                                fontSize: '0.9rem'
                            }}
                        >
                            <option value="">Todos</option>
                            <option value="entrada">Entrada</option>
                            <option value="salida">Salida</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Producto
                        </label>
                        <select
                            value={filterProduct}
                            onChange={(e) => setFilterProduct(e.target.value)}
                            style={{ 
                                width: '100%',
                                padding: '10px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                background: 'rgba(255,255,255,0.1)', 
                                color: '#fff',
                                fontSize: '0.9rem'
                            }}
                        >
                            <option value="">Todos</option>
                            {products.map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{ 
                                width: '100%',
                                padding: '10px', 
                                borderRadius: '8px', 
                                border: '1px solid rgba(255,255,255,0.2)', 
                                background: 'rgba(255,255,255,0.1)', 
                                color: '#fff',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista de movimientos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredMovements.length === 0 ? (
                    <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No se encontraron movimientos</p>
                    </div>
                ) : (
                    filteredMovements.map((movement) => (
                        <div key={movement.id} className="glass glass-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                                    <div style={{ 
                                        width: '40px', 
                                        height: '40px', 
                                        borderRadius: '10px', 
                                        background: movement.type === 'entrada' 
                                            ? 'rgba(34, 197, 94, 0.2)' 
                                            : 'rgba(244, 63, 94, 0.2)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        {movement.type === 'entrada' ? (
                                            <ArrowUpCircle size={20} color="#22c55e" />
                                        ) : (
                                            <ArrowDownCircle size={20} color="var(--accent-color)" />
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>
                                                {movement.product?.name || 'Producto eliminado'}
                                            </h3>
                                            <span style={{ 
                                                padding: '4px 8px', 
                                                borderRadius: '6px', 
                                                fontSize: '0.75rem',
                                                background: movement.type === 'entrada' 
                                                    ? 'rgba(34, 197, 94, 0.2)' 
                                                    : 'rgba(244, 63, 94, 0.2)',
                                                color: movement.type === 'entrada' ? '#22c55e' : 'var(--accent-color)',
                                                textTransform: 'uppercase',
                                                fontWeight: '600'
                                            }}>
                                                {movement.type}
                                            </span>
                                        </div>
                                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Cantidad: <strong style={{ color: '#fff' }}>{movement.quantity}</strong>
                                        </p>
                                        <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            Stock: <strong style={{ color: '#fff' }}>{movement.stockBefore}</strong> → <strong style={{ color: '#fff' }}>{movement.stockAfter}</strong>
                                        </p>
                                        {movement.description && (
                                            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                {movement.description}
                                            </p>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={14} />
                                                {new Date(movement.date).toLocaleDateString('es-PE', { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            {movement.user && (
                                                <span>
                                                    Por: {movement.user.names} {movement.user.surnames}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(movement.id)}
                                    style={{ 
                                        padding: '8px', 
                                        borderRadius: '8px', 
                                        border: 'none', 
                                        background: 'rgba(244, 63, 94, 0.2)', 
                                        color: 'var(--accent-color)', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    title="Eliminar movimiento"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de nuevo movimiento */}
            <AnimatePresence>
                {showModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ 
                                position: 'fixed', 
                                inset: 0, 
                                background: 'rgba(0,0,0,0.8)', 
                                zIndex: 50,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px'
                            }}
                            onClick={() => {
                                setShowModal(false)
                                resetForm()
                            }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="glass glass-card"
                                style={{ 
                                    maxWidth: '500px', 
                                    width: '100%',
                                    maxHeight: '90vh',
                                    overflow: 'auto'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '24px',
                                    paddingBottom: '16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <h2 style={{ 
                                        fontSize: '1.5rem', 
                                        margin: 0,
                                        color: '#fff',
                                        fontWeight: 600
                                    }}>
                                        Nuevo Movimiento
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowModal(false)
                                            resetForm()
                                        }}
                                        style={{ 
                                            background: 'rgba(255,255,255,0.1)', 
                                            border: 'none', 
                                            color: '#fff', 
                                            cursor: 'pointer',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            Producto *
                                        </label>
                                        <select
                                            value={formData.productId}
                                            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                                            required
                                            style={{ 
                                                width: '100%',
                                                padding: '12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid rgba(255,255,255,0.2)', 
                                                background: 'rgba(255,255,255,0.1)', 
                                                color: '#fff',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            <option value="">Seleccionar producto</option>
                                            {products.map((product) => (
                                                <option key={product.id} value={product.id}>
                                                    {product.name} (Stock: {product.stock}
                                                    {isLowStock(product.stock) ? ` · bajo (menos de ${LOW_STOCK_THRESHOLD} u.)` : ''})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            Tipo *
                                        </label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            required
                                            style={{ 
                                                width: '100%',
                                                padding: '12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid rgba(255,255,255,0.2)', 
                                                background: 'rgba(255,255,255,0.1)', 
                                                color: '#fff',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            <option value="entrada">Entrada</option>
                                            <option value="salida">Salida</option>
                                        </select>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Cantidad *
                                            </label>
                                            <input
                                                type="number"
                                                placeholder="Cantidad"
                                                value={formData.quantity}
                                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                                required
                                                min="1"
                                                style={{ 
                                                    width: '100%',
                                                    padding: '12px', 
                                                    borderRadius: '8px', 
                                                    border: '1px solid rgba(255,255,255,0.2)', 
                                                    background: 'rgba(255,255,255,0.1)', 
                                                    color: '#fff',
                                                    fontSize: '1rem'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Fecha *
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.date}
                                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                                required
                                                style={{ 
                                                    width: '100%',
                                                    padding: '12px', 
                                                    borderRadius: '8px', 
                                                    border: '1px solid rgba(255,255,255,0.2)', 
                                                    background: 'rgba(255,255,255,0.1)', 
                                                    color: '#fff',
                                                    fontSize: '1rem'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                            Descripción / Observaciones
                                        </label>
                                        <textarea
                                            placeholder="Descripción opcional del movimiento..."
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            style={{ 
                                                width: '100%',
                                                padding: '12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid rgba(255,255,255,0.2)', 
                                                background: 'rgba(255,255,255,0.1)', 
                                                color: '#fff',
                                                fontSize: '1rem',
                                                resize: 'vertical',
                                                fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>

                                    <button className="btn-primary" type="submit">
                                        Registrar Movimiento
                                    </button>
                                </form>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

