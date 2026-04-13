import { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, Plus, Edit, Trash2, Search, X, Upload, Image as ImageIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { productAPI } from '../services/productAPI'
import { displayImageUrl } from '../services/api'
import { isLowStock, LOW_STOCK_THRESHOLD } from '../utils/stockThreshold.js'
import { notifyInventoryUpdated } from '../utils/inventoryEvents.js'
import { ADMIN_PRODUCTS_PAGE_SIZE } from '../utils/paginationConstants.js'
import PaginationBar from './PaginationBar.jsx'

export default function AdminProducts() {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [categories, setCategories] = useState([])
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        image: '',
        category: '',
        isActive: true
    })
    const [imagePreview, setImagePreview] = useState('')
    const [adminProductsPage, setAdminProductsPage] = useState(1)

    const resetForm = useCallback(() => {
        // Usar la primera categoría disponible o vacío si no hay categorías
        const defaultCategory = categories.length > 0 ? categories[0] : ''
        setFormData({
            name: '',
            description: '',
            price: '',
            image: '',
            category: defaultCategory,
            isActive: true
        })
        setEditingProduct(null)
        setImagePreview('')
    }, [categories])

    useEffect(() => {
        loadProducts()
    }, [])

    // Actualizar categoría por defecto cuando se cargan las categorías
    useEffect(() => {
        if (categories.length > 0 && !formData.category) {
            setFormData(prev => ({ ...prev, category: categories[0] }))
        }
    }, [categories])

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

    const loadProducts = async () => {
        try {
            setLoading(true)
            const data = await productAPI.getAll()
            setProducts(data)
            
            // Extraer todas las categorías únicas de los productos
            const allCategories = data.map(product => product.category).filter(cat => cat && cat.trim() !== '')
            const uniqueCategories = [...new Set(allCategories)]
            // Ordenar alfabéticamente
            uniqueCategories.sort()
            
            setCategories(uniqueCategories)
            
            // Si no hay categorías, establecer una por defecto
            if (uniqueCategories.length > 0 && !formData.category) {
                setFormData(prev => ({ ...prev, category: uniqueCategories[0] }))
            }
            
            setError('')
        } catch (err) {
            setError(err.message || 'Error al cargar productos')
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten archivos de imagen')
            return
        }

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            setError('La imagen no debe superar los 5MB')
            return
        }

        try {
            setUploadingImage(true)
            setError('')
            
            // Crear preview local
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result)
            }
            reader.readAsDataURL(file)

            // Subir a Cloudinary
            const result = await productAPI.uploadImage(file)
            setFormData({ ...formData, image: result.imageUrl })
        } catch (err) {
            setError(err.message || 'Error al subir imagen')
            setImagePreview('')
        } finally {
            setUploadingImage(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.name || !formData.price) {
            setError('Nombre y precio son requeridos')
            return
        }

        try {
            // Asegurar que el stock siempre sea 0 para productos nuevos
            const productData = editingProduct 
                ? { ...formData } // Al editar, no modificamos el stock
                : { ...formData, stock: 0 } // Al crear, siempre stock 0
            
            if (editingProduct) {
                await productAPI.update(editingProduct.id, productData)
            } else {
                await productAPI.create(productData)
            }
            
            // Recargar productos para actualizar las categorías
            await loadProducts()
            notifyInventoryUpdated()
            resetForm()
            setShowModal(false)
        } catch (err) {
            setError(err.message || 'Error al guardar producto')
        }
    }

    const handleEdit = (product) => {
        setEditingProduct(product)
        const productCategory = product.category || ''
        
        // Si la categoría del producto no está en la lista, agregarla
        if (productCategory && !categories.includes(productCategory)) {
            setCategories(prev => {
                const updated = [...prev, productCategory].sort()
                return updated
            })
        }
        
        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price,
            image: product.image || '',
            category: productCategory || (categories.length > 0 ? categories[0] : ''),
            isActive: product.isActive !== undefined ? product.isActive : true
        })
        setImagePreview(product.image || '')
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) {
            return
        }

        try {
            await productAPI.delete(id)
            await loadProducts()
            notifyInventoryUpdated()
        } catch (err) {
            setError(err.message || 'Error al eliminar producto')
        }
    }

    const handleNewProduct = () => {
        resetForm()
        setShowModal(true)
    }

    const filteredProducts = useMemo(() => {
        const search = searchTerm.toLowerCase().trim()
        if (!search) return products
        return products.filter(
            (product) =>
                product.name.toLowerCase().includes(search) ||
                (product.description && product.description.toLowerCase().includes(search)) ||
                (product.category && product.category.toLowerCase().includes(search))
        )
    }, [products, searchTerm])

    const adminProductsTotalPages = Math.max(1, Math.ceil(filteredProducts.length / ADMIN_PRODUCTS_PAGE_SIZE))
    const adminProductsPageSafe = Math.min(Math.max(1, adminProductsPage), adminProductsTotalPages)
    const adminProductsPageSlice = filteredProducts.slice(
        (adminProductsPageSafe - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
        adminProductsPageSafe * ADMIN_PRODUCTS_PAGE_SIZE
    )

    useEffect(() => {
        setAdminProductsPage(1)
    }, [searchTerm])

    useEffect(() => {
        setAdminProductsPage((p) => Math.min(p, adminProductsTotalPages))
    }, [adminProductsTotalPages])

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Cargando productos...</p>
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Gestión de Productos</h2>
                <button className="btn-primary" onClick={handleNewProduct} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

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

            {/* Buscador */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                    type="text"
                    placeholder="Buscar por nombre, descripción o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                        width: '100%', 
                        padding: '12px 12px 12px 40px', 
                        borderRadius: '8px', 
                        border: 'none', 
                        background: 'rgba(255,255,255,0.1)', 
                        color: '#fff' 
                    }}
                />
            </div>

            {/* Lista de productos (paginada; miniatura completa sin recorte) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredProducts.length === 0 ? (
                    <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No se encontraron productos</p>
                    </div>
                ) : (
                    adminProductsPageSlice.map((product) => (
                        <div
                            key={product.id}
                            className="glass glass-card"
                            style={{
                                padding: '0',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                ...(isLowStock(product.stock)
                                    ? { borderLeft: '4px solid var(--accent-color)', boxShadow: 'inset 0 0 0 1px rgba(244, 63, 94, 0.15)' }
                                    : {}),
                            }}
                        >
                            <div
                                className="admin-product-card-thumb"
                                style={{
                                    aspectRatio: '1',
                                    width: '100%',
                                    flexShrink: 0,
                                    background: 'rgba(255,255,255,0.06)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '12px',
                                    boxSizing: 'border-box',
                                }}
                            >
                                {product.image ? (
                                    <img
                                        src={displayImageUrl(product.image)}
                                        alt={product.name}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            width: 'auto',
                                            height: 'auto',
                                            objectFit: 'contain',
                                            objectPosition: 'center',
                                        }}
                                    />
                                ) : (
                                    <ImageIcon size={48} color="var(--text-muted)" />
                                )}
                            </div>
                            <div style={{ padding: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <Package size={20} color="var(--primary-color)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem', flex: 1 }}>{product.name}</h3>
                                    {!product.isActive && (
                                        <span style={{ 
                                            padding: '4px 8px', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem',
                                            background: 'rgba(244, 63, 94, 0.2)',
                                            color: 'var(--accent-color)'
                                        }}>
                                            Inactivo
                                        </span>
                                    )}
                                </div>
                                {product.description && (
                                    <p style={{ margin: '8px 0', fontSize: '0.85rem', color: 'var(--text-muted)', 
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}>
                                        {product.description}
                                    </p>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                                    <div>
                                        <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                            S/ {parseFloat(product.price).toFixed(2)}
                                        </p>
                                        <p
                                            style={{
                                                margin: '4px 0',
                                                fontSize: '0.75rem',
                                                color: isLowStock(product.stock) ? 'var(--accent-color)' : 'var(--text-muted)',
                                                fontWeight: isLowStock(product.stock) ? 700 : 400,
                                            }}
                                        >
                                            {product.category} • Stock: {product.stock}
                                            {isLowStock(product.stock) ? ` · bajo (menos de ${LOW_STOCK_THRESHOLD} u.)` : ''}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => handleEdit(product)}
                                            style={{ 
                                                padding: '8px', 
                                                borderRadius: '8px', 
                                                border: 'none', 
                                                background: 'rgba(99, 102, 241, 0.2)', 
                                                color: 'var(--primary-color)', 
                                                cursor: 'pointer' 
                                            }}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product.id)}
                                            style={{ 
                                                padding: '8px', 
                                                borderRadius: '8px', 
                                                border: 'none', 
                                                background: 'rgba(244, 63, 94, 0.2)', 
                                                color: 'var(--accent-color)', 
                                                cursor: 'pointer' 
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {filteredProducts.length > 0 && (
                <PaginationBar
                    page={adminProductsPageSafe}
                    totalPages={adminProductsTotalPages}
                    onPageChange={setAdminProductsPage}
                />
            )}

            {/* Modal de crear/editar */}
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
                                    maxWidth: '600px', 
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
                                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
                                            justifyContent: 'center',
                                            transition: 'all 0.3s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.background = 'rgba(244, 63, 94, 0.3)';
                                            e.target.style.color = 'var(--accent-color)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(255,255,255,0.1)';
                                            e.target.style.color = '#fff';
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {/* Preview de imagen */}
                                    {(imagePreview || formData.image) && (
                                        <div style={{ 
                                            width: '100%', 
                                            height: '200px', 
                                            borderRadius: '8px', 
                                            overflow: 'hidden',
                                            background: 'rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <img 
                                                src={displayImageUrl(imagePreview || formData.image)} 
                                                alt="Preview" 
                                                style={{ 
                                                    maxWidth: '100%', 
                                                    maxHeight: '100%', 
                                                    objectFit: 'contain',
                                                    borderRadius: '8px'
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Subir imagen */}
                                    <div>
                                        <label style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            background: 'rgba(99, 102, 241, 0.2)',
                                            color: 'var(--primary-color)',
                                            cursor: uploadingImage ? 'not-allowed' : 'pointer',
                                            justifyContent: 'center',
                                            border: '1px solid rgba(99, 102, 241, 0.3)',
                                            transition: 'all 0.3s ease',
                                            opacity: uploadingImage ? 0.6 : 1
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!uploadingImage) {
                                                e.target.style.background = 'rgba(99, 102, 241, 0.3)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.background = 'rgba(99, 102, 241, 0.2)';
                                        }}
                                        >
                                            <Upload size={20} />
                                            <span>{uploadingImage ? 'Subiendo...' : (formData.image ? 'Cambiar Imagen' : 'Subir Imagen')}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                disabled={uploadingImage}
                                                style={{ display: 'none' }}
                                            />
                                        </label>
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Nombre del producto"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        style={{ 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            background: 'rgba(255,255,255,0.1)', 
                                            color: '#fff',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.background = 'rgba(255,255,255,0.15)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                            e.target.style.background = 'rgba(255,255,255,0.1)';
                                        }}
                                    />

                                    <textarea
                                        placeholder="Descripción"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        style={{ 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            background: 'rgba(255,255,255,0.1)', 
                                            color: '#fff', 
                                            resize: 'vertical',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            width: '100%',
                                            boxSizing: 'border-box',
                                            fontFamily: 'inherit'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.background = 'rgba(255,255,255,0.15)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                            e.target.style.background = 'rgba(255,255,255,0.1)';
                                        }}
                                    />

                                    <input
                                        type="number"
                                        placeholder="Precio"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        required
                                        min="0"
                                        step="0.01"
                                        style={{ 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            background: 'rgba(255,255,255,0.1)', 
                                            color: '#fff',
                                            fontSize: '1rem',
                                            outline: 'none',
                                            transition: 'all 0.3s ease',
                                            width: '100%',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = 'var(--primary-color)';
                                            e.target.style.background = 'rgba(255,255,255,0.15)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                            e.target.style.background = 'rgba(255,255,255,0.1)';
                                        }}
                                    />

                                    <div style={{ 
                                        position: 'relative', 
                                        width: '100%',
                                        margin: 0,
                                        padding: 0
                                    }}>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            style={{ 
                                                padding: '12px 36px 12px 12px', 
                                                borderRadius: '8px', 
                                                border: '1px solid rgba(255,255,255,0.2)', 
                                                background: 'rgba(255,255,255,0.1)', 
                                                color: '#fff',
                                                width: '100%',
                                                fontSize: '1rem',
                                                fontWeight: '500',
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                MozAppearance: 'none',
                                                cursor: 'pointer',
                                                outline: 'none',
                                                transition: 'all 0.3s ease',
                                                boxSizing: 'border-box',
                                                lineHeight: '1.5',
                                                fontFamily: 'inherit',
                                                margin: 0,
                                                display: 'block',
                                                textIndent: 0,
                                                textOverflow: '',
                                                overflow: 'hidden'
                                            }}
                                            onFocus={(e) => {
                                                e.target.style.borderColor = 'var(--primary-color)';
                                                e.target.style.background = 'rgba(255,255,255,0.15)';
                                            }}
                                            onBlur={(e) => {
                                                e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                                                e.target.style.background = 'rgba(255,255,255,0.1)';
                                            }}
                                        >
                                            {categories.length === 0 ? (
                                                <option value="" disabled>Cargando categorías...</option>
                                            ) : (
                                                categories.map(cat => (
                                                    <option 
                                                        key={cat} 
                                                        value={cat}
                                                        style={{ 
                                                            background: '#1a1a1a', 
                                                            color: '#fff',
                                                            padding: '12px 8px',
                                                            fontSize: '1rem',
                                                            fontWeight: '500',
                                                            border: 'none',
                                                            margin: 0
                                                        }}
                                                    >
                                                        {cat}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                        <div style={{
                                            position: 'absolute',
                                            right: '12px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            pointerEvents: 'none',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.875rem',
                                            lineHeight: 1
                                        }}>
                                            ▼
                                        </div>
                                    </div>

                                    <label style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px', 
                                        cursor: 'pointer',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            style={{ 
                                                width: '20px', 
                                                height: '20px', 
                                                cursor: 'pointer',
                                                accentColor: 'var(--primary-color)'
                                            }}
                                        />
                                        <span style={{ fontSize: '1rem', color: '#fff' }}>Producto activo</span>
                                    </label>

                                    <button className="btn-primary" type="submit" disabled={uploadingImage}>
                                        {uploadingImage ? 'Subiendo imagen...' : (editingProduct ? 'Actualizar' : 'Crear') + ' Producto'}
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

