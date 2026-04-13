import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { ShoppingCart, Home, User, Menu, X, Phone, Info, Package, Users, Shield, Heart, Leaf, Users as UsersIcon, Zap, MapPin, MessageCircle, MessageSquare, AlertTriangle, FileText, ZoomIn, Eye, EyeOff, ClipboardList, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const Register = lazy(() => import('./components/Register'))
const AdminUsers = lazy(() => import('./components/AdminUsers'))
const AdminProducts = lazy(() => import('./components/AdminProducts'))
const AdminKardex = lazy(() => import('./components/AdminKardex'))
const AdminOrders = lazy(() => import('./components/AdminOrders'))
const CheckoutModal = lazy(() => import('./components/CheckoutModal'))
const Profile = lazy(() => import('./components/Profile'))
const MyOrders = lazy(() => import('./components/MyOrders'))
const MyContactTickets = lazy(() => import('./components/MyContactTickets'))
const AdminContactTickets = lazy(() => import('./components/AdminContactTickets'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))
const CamanaDistrictMap = lazy(() => import('./components/CamanaDistrictMap'))
const PaginationBar = lazy(() => import('./components/PaginationBar.jsx'))
const CustomSelect = lazy(() => import('./components/CustomSelect.jsx'))

import { authAPI, productsAPI, setTokenExpiredCallback, displayImageUrl } from './services/api'
import { orderAPI } from './services/orderAPI.js'
import { contactTicketAPI } from './services/contactTicketAPI.js'
import { isLowStock, LOW_STOCK_THRESHOLD } from './utils/stockThreshold.js'
import { INVENTORY_UPDATED_EVENT } from './utils/inventoryEvents.js'
import { CATALOG_PAGE_SIZE } from './utils/paginationConstants.js'
function AppTabSuspenseFallback() {
    return (
        <div className="glass glass-card" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '12px' }}>
            Cargando…
        </div>
    )
}

/** Imagen de tarjeta con control central para abrir detalle (catálogo / inicio / carrito compacto) */
function ProductImageDetailTrigger({ product, onOpen, height = 140, compact = false }) {
    const h = typeof height === 'number' ? `${height}px` : height
    const fallback = `/assets/producto${product.id % 6 + 1}.png`
    const src = (product.image && displayImageUrl(product.image)) || fallback
    return (
        <div
            style={{
                height: h,
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)',
                padding: compact ? '4px' : '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <img
                src={src}
                alt={product.name}
                loading="lazy"
                width={compact ? 60 : 200}
                height={compact ? 60 : 140}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => {
                    e.target.src = fallback
                }}
            />
            <button
                type="button"
                className={compact ? 'product-detail-trigger product-detail-trigger--compact' : 'product-detail-trigger'}
                aria-label={`Ver más detalles de ${product.name}`}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onOpen(product)
                }}
            >
                <ZoomIn size={compact ? 17 : 22} strokeWidth={2.5} aria-hidden />
                {!compact && <span>Ver más</span>}
            </button>
        </div>
    )
}

function ProductDetailModal({ product, resolveProduct, onClose, onAddToCart }) {
    const p = resolveProduct(product)
    if (!p) return null
    const fallback = `/assets/producto${p.id % 6 + 1}.png`
    const imgSrc = (p.image && displayImageUrl(p.image)) || fallback
    const desc = (p.description && String(p.description).trim()) || 'Sin descripción disponible.'
    const categoryLabel = p.category ? String(p.category) : 'General'
    const stockVal = p.stock !== undefined && p.stock !== null ? Number(p.stock) : null

    return (
        <motion.div
            className="product-detail-root"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                role="presentation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="product-detail-backdrop"
                onClick={onClose}
            />
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="product-detail-title"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                className="product-detail-panel glass"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" className="product-detail-close" onClick={onClose} aria-label="Cerrar detalle">
                    <X size={22} />
                </button>
                <div className="product-detail-image-wrap">
                    <img
                        src={imgSrc}
                        alt={p.name}
                        className="product-detail-image"
                        onError={(e) => {
                            e.target.src = fallback
                        }}
                    />
                </div>
                <div className="product-detail-body">
                    <h2 id="product-detail-title" className="product-detail-title">
                        {p.name}
                    </h2>
                    <p className="product-detail-price">S/ {parseFloat(p.price).toFixed(2)}</p>
                    <p className="product-detail-meta">
                        <span className="product-detail-badge">{categoryLabel}</span>
                        {stockVal !== null && !Number.isNaN(stockVal) && (
                            <span className="product-detail-stock">{stockVal > 0 ? `${stockVal} en stock` : 'Consultar disponibilidad'}</span>
                        )}
                    </p>
                    <p className="product-detail-desc">{desc}</p>
                    <button
                        type="button"
                        className="btn-primary product-detail-add"
                        onClick={() => {
                            const { quantity: _q, ...rest } = p
                            onAddToCart(rest)
                            onClose()
                        }}
                    >
                        Agregar al carrito
                    </button>
                </div>
            </motion.div>
        </motion.div>
    )
}

/** Portada: WebP generado con npm run optimize-images; JPG como respaldo. */
const HOME_CAROUSEL_SLIDES = [
    { webp: '/assets/carrusel1.webp', jpg: '/assets/carrusel1.jpg' },
    { webp: '/assets/carrusel2.webp', jpg: '/assets/carrusel2.jpg' },
]
const FALLBACK_HERO = '/assets/bannner.jpg'

const CONTACT_ASUNTO_OPTIONS = [
    { value: 'QUEJA', label: 'Queja' },
    { value: 'CONSULTA', label: 'Consulta' },
    { value: 'OTRO', label: 'Otro' },
]

function HomeHeroCarousel({ onVerCatalogo }) {
    const [index, setIndex] = useState(0)

    useEffect(() => {
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % HOME_CAROUSEL_SLIDES.length)
        }, 5000)
        return () => clearInterval(id)
    }, [])

    // Precargar la siguiente diapositiva (WebP).
    useEffect(() => {
        const next = (index + 1) % HOME_CAROUSEL_SLIDES.length
        const img = new Image()
        img.src = HOME_CAROUSEL_SLIDES[next].webp
    }, [index])

    return (
        <div
            style={{
                textAlign: 'center',
                padding: '40px 0',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '20px',
                marginBottom: '20px',
                minHeight: '200px',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    background: 'rgba(0,0,0,0.35)',
                }}
            >
                <motion.div
                    key={HOME_CAROUSEL_SLIDES[index].jpg}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                    }}
                >
                    <picture>
                        <source srcSet={HOME_CAROUSEL_SLIDES[index].webp} type="image/webp" />
                        <img
                            src={HOME_CAROUSEL_SLIDES[index].jpg}
                            alt=""
                            aria-hidden
                            width={960}
                            height={540}
                            sizes="(max-width: 640px) 100vw, min(960px, 100vw)"
                            decoding="async"
                            fetchPriority={index === 0 ? 'high' : 'low'}
                            loading="eager"
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                objectPosition: 'center',
                                opacity: 0.75,
                                filter: 'none',
                            }}
                            onError={(e) => {
                                const el = e.currentTarget
                                if (el.src.includes('carrusel')) {
                                    el.src = FALLBACK_HERO
                                    el.style.objectFit = 'cover'
                                    el.style.opacity = 0.65
                                }
                            }}
                        />
                    </picture>
                </motion.div>
            </div>
            <div style={{ position: 'relative', zIndex: 1, padding: '20px' }}>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '10px', lineHeight: 1.1, textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}>
                    Nutrición <br />
                    <span style={{ color: 'var(--primary-color)' }}>Premium</span>
                </h2>
                <p style={{ color: '#e5e7eb', fontSize: '1.1rem', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>Lo mejor para tus animales.</p>
                <button
                    type="button"
                    className="btn-primary"
                    onClick={onVerCatalogo}
                    style={{ marginTop: '20px', background: 'var(--accent-color)', color: '#ffffff', boxShadow: '0 4px 15px rgba(251, 113, 133, 0.4)' }}
                >
                    Ver Catálogo
                </button>
            </div>
            <div
                role="tablist"
                aria-label="Carrusel de portada"
                style={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '8px',
                    marginTop: '12px',
                }}
            >
                {HOME_CAROUSEL_SLIDES.map((_, i) => (
                    <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === index}
                        aria-label={`Imagen ${i + 1} de ${HOME_CAROUSEL_SLIDES.length}`}
                        onClick={() => setIndex(i)}
                        style={{
                            width: i === index ? '22px' : '8px',
                            height: '8px',
                            borderRadius: '999px',
                            border: 'none',
                            padding: 0,
                            background: i === index ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
                            cursor: 'pointer',
                            transition: 'width 0.2s, background 0.2s',
                        }}
                    />
                ))}
            </div>
        </div>
    )
}

/** Módulos de gestión bajo el hub «admin-panel» (no incluye el propio panel). */
const ADMIN_SUB_TABS = new Set([
    'admin-orders',
    'admin-contact-tickets',
    'admin-products',
    'admin-users',
    'admin-kardex',
])

function App() {
    const [activeTab, setActiveTab] = useState('home')
    const [cartCount, setCartCount] = useState(0)
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [user, setUser] = useState(null)
    const [loginData, setLoginData] = useState({ email: '', password: '' })
    const [loginShowPassword, setLoginShowPassword] = useState(false)
    const [loginError, setLoginError] = useState('')
    const [loading, setLoading] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('todos')
    const [lowStockProducts, setLowStockProducts] = useState([])
    const [detailProduct, setDetailProduct] = useState(null)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [catalogPage, setCatalogPage] = useState(1)
    const [catalogSearch, setCatalogSearch] = useState('')
    /** Página del carrusel de categorías en inicio (0 = primeras 2, luego las siguientes 2, …). */
    const [homeCategoryPage, setHomeCategoryPage] = useState(0)

    /** Formulario Contáctenos */
    const [contactFullName, setContactFullName] = useState('')
    const [contactEmail, setContactEmail] = useState('')
    /** '' | 'QUEJA' | 'CONSULTA' | 'OTRO' */
    const [contactAsunto, setContactAsunto] = useState('')
    const [contactOrderId, setContactOrderId] = useState('')
    const [contactQuejaText, setContactQuejaText] = useState('')
    const [contactMensaje, setContactMensaje] = useState('')
    const [contactOrders, setContactOrders] = useState([])
    const [contactOrdersLoading, setContactOrdersLoading] = useState(false)
    const [contactSubmitting, setContactSubmitting] = useState(false)

    const resolveDetailProduct = (item) => products.find((x) => x.id === item.id) || item

    const clearCart = () => {
        setCart([])
        setCartCount(0)
        localStorage.removeItem('cart')
    }

    const loadProducts = useCallback(async () => {
        try {
            const data = await productsAPI.getAll()
            setProducts(data)
            const lowStock = data.filter((p) => p.isActive && isLowStock(p.stock))
            setLowStockProducts(lowStock)
        } catch (error) {
            console.error('Error al cargar productos:', error)
        }
    }, [])

    useEffect(() => {
        if (!detailProduct) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [detailProduct])

    // Cargar productos al montar el componente
    useEffect(() => {
        // Cargar productos después de un pequeño delay para mejorar FCP
        const timer = setTimeout(() => {
            loadProducts()
        }, 100)
        
        checkAuth()
        loadCart()
        
        // Configurar callback para cuando el token expire
        setTokenExpiredCallback(() => {
            setUser(null)
            setActiveTab('home')
            alert('Tu sesión ha caducado (máximo 2 horas). Inicia sesión de nuevo.')
        })
        
        return () => clearTimeout(timer)
    }, [loadProducts])

    useEffect(() => {
        const onInventory = () => loadProducts()
        window.addEventListener(INVENTORY_UPDATED_EVENT, onInventory)
        return () => window.removeEventListener(INVENTORY_UPDATED_EVENT, onInventory)
    }, [loadProducts])

    // Verificar periódicamente si el token está expirado (cada minuto)
    useEffect(() => {
        if (!user) return // Solo verificar si hay usuario logueado

        const checkInterval = setInterval(async () => {
            const isExpired = await authAPI.checkTokenExpiration()
            if (isExpired) {
                // El callback ya se ejecutó en checkTokenExpiration
                clearInterval(checkInterval)
            }
        }, 60000) // Verificar cada minuto

        return () => clearInterval(checkInterval)
    }, [user])

    // Escuchar evento de token expirado (respaldo para adminAPI)
    useEffect(() => {
        const handleTokenExpired = () => {
            setUser(null)
            setActiveTab('home')
            alert('Tu sesión ha caducado (máximo 2 horas). Inicia sesión de nuevo.')
        }

        window.addEventListener('tokenExpired', handleTokenExpired)
        return () => window.removeEventListener('tokenExpired', handleTokenExpired)
    }, [])

    const checkAuth = () => {
        const currentUser = authAPI.getCurrentUser()
        if (currentUser) {
            setUser(currentUser)
        }
    }

    const loadCart = () => {
        const savedCart = localStorage.getItem('cart')
        if (savedCart) {
            const cartItems = JSON.parse(savedCart)
            setCart(cartItems)
            setCartCount(cartItems.reduce((sum, item) => sum + item.quantity, 0))
        }
    }

    const addToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id)
        let newCart
        
        if (existingItem) {
            newCart = cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            )
        } else {
            newCart = [...cart, { ...product, quantity: 1 }]
        }
        
        setCart(newCart)
        setCartCount(newCart.reduce((sum, item) => sum + item.quantity, 0))
        localStorage.setItem('cart', JSON.stringify(newCart))
    }

    const removeFromCart = (productId) => {
        const newCart = cart.filter(item => item.id !== productId)
        setCart(newCart)
        setCartCount(newCart.reduce((sum, item) => sum + item.quantity, 0))
        localStorage.setItem('cart', JSON.stringify(newCart))
    }

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            removeFromCart(productId)
            return
        }
        
        const newCart = cart.map(item =>
            item.id === productId
                ? { ...item, quantity: newQuantity }
                : item
        )
        
        setCart(newCart)
        setCartCount(newCart.reduce((sum, item) => sum + item.quantity, 0))
        localStorage.setItem('cart', JSON.stringify(newCart))
    }

    const getCartTotal = () => {
        return cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
    }

    const handleLogin = async (e) => {
        e?.preventDefault()
        setLoading(true)
        setLoginError('')

        try {
            const response = await authAPI.login(loginData.email, loginData.password)
            setUser(response.user)
            alert('¡Bienvenido!')
            setActiveTab(response.user?.role === 'administrador' ? 'admin-panel' : 'home')
            setLoginData({ email: '', password: '' })
        } catch (error) {
            setLoginError(error.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await authAPI.logout()
        setUser(null)
        setActiveTab('home')
        alert('Sesión cerrada')
    }

    const navigateTo = (tab) => {
        setActiveTab(tab)
        setIsMenuOpen(false)
        // Scroll hacia arriba cuando cambia de pestaña
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    useEffect(() => {
        if (activeTab !== 'contact') return
        if (user) {
            setContactFullName(`${user.names || ''} ${user.surnames || ''}`.trim())
            setContactEmail(user.email || '')
        } else {
            setContactFullName('')
            setContactEmail('')
        }
    }, [activeTab, user])

    useEffect(() => {
        if (contactAsunto === 'QUEJA') {
            setContactMensaje('')
        } else {
            setContactOrderId('')
            setContactQuejaText('')
        }
    }, [contactAsunto])

    useEffect(() => {
        if (activeTab !== 'contact' || contactAsunto !== 'QUEJA' || !user) {
            setContactOrders([])
            setContactOrdersLoading(false)
            return
        }
        let cancelled = false
        setContactOrdersLoading(true)
        orderAPI
            .listMine()
            .then((list) => {
                if (!cancelled) setContactOrders(Array.isArray(list) ? list : [])
            })
            .catch(() => {
                if (!cancelled) setContactOrders([])
            })
            .finally(() => {
                if (!cancelled) setContactOrdersLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [activeTab, contactAsunto, user])

    const handleContactSubmit = async (e) => {
        e.preventDefault()
        const name = contactFullName.trim()
        const email = contactEmail.trim()
        if (!name || !email) {
            alert('Completa nombres y apellidos y correo.')
            return
        }
        if (!contactAsunto) {
            alert('Selecciona un asunto.')
            return
        }
        if (contactAsunto === 'QUEJA') {
            if (!user) {
                alert('Para enviar una queja vinculada a un pedido debes iniciar sesión.')
                navigateTo('login')
                return
            }
            if (!contactOrders.length) {
                alert('No tienes pedidos registrados para asociar a la queja.')
                return
            }
            if (!contactOrderId) {
                alert('Selecciona el pedido relacionado con tu queja.')
                return
            }
            if (!contactQuejaText.trim()) {
                alert('Describe qué ocurrió con ese pedido.')
                return
            }
        } else if (!contactMensaje.trim()) {
            alert('Escribe tu mensaje.')
            return
        }

        const payload = {
            type: contactAsunto,
            message: contactAsunto === 'QUEJA' ? contactQuejaText.trim() : contactMensaje.trim(),
        }
        if (contactAsunto === 'QUEJA') {
            payload.orderId = Number(contactOrderId)
        }
        if (!user) {
            payload.guestName = name
            payload.guestEmail = email
        }

        setContactSubmitting(true)
        try {
            const created = await contactTicketAPI.create(payload)
            const hint = user
                ? ` Consulta el estado en «Mis consultas» desde el menú de tu cuenta.`
                : ` Si creas una cuenta con este correo, podrás ver el seguimiento en «Mis consultas».`
            alert(`Mensaje registrado. Número de caso: #${created.id}.${hint}`)
            if (contactAsunto === 'QUEJA') {
                setContactQuejaText('')
            } else {
                setContactMensaje('')
            }
        } catch (err) {
            alert(err.message || 'No se pudo enviar el mensaje. Intenta de nuevo.')
        } finally {
            setContactSubmitting(false)
        }
    }

    const categoryMapCatalog = useMemo(
        () => ({
            pollos: ['pollos', 'pollo'],
            gallos: ['gallos', 'gallo'],
            ponedoras: ['ponedoras', 'ponedora'],
            patos: ['patos', 'pato'],
            pavos: ['pavos', 'pavo'],
            porcinos: ['porcinos', 'porcino', 'cerdos', 'cerdo'],
            mascotas: ['mascotas', 'mascota', 'perros', 'gatos'],
            medicina: ['medicamentos', 'medicina', 'medicamento'],
        }),
        []
    )

    const homeCategories = useMemo(
        () => [
            { id: 'ponedoras', label: 'PONEDORAS' },
            { id: 'pollos', label: 'POLLOS' },
            { id: 'porcinos', label: 'PORCINOS' },
            { id: 'gallos', label: 'GALLOS' },
            { id: 'patos', label: 'PATOS' },
            { id: 'pavos', label: 'PAVOS' },
            { id: 'mascotas', label: 'MASCOTAS' },
            { id: 'medicina', label: 'MEDICINA' },
        ],
        []
    )

    const HOME_CATEGORIES_PAGE_SIZE = 2
    const homeCategoryPageCount = Math.max(1, Math.ceil(homeCategories.length / HOME_CATEGORIES_PAGE_SIZE))
    const homeCategoriesPageSlice = useMemo(() => {
        const start = homeCategoryPage * HOME_CATEGORIES_PAGE_SIZE
        return homeCategories.slice(start, start + HOME_CATEGORIES_PAGE_SIZE)
    }, [homeCategories, homeCategoryPage])

    // Una imagen por categoría sin repetir el mismo producto (evita dos "MASCOTAS" si un ítem encaja en varias palabras clave)
    const homeCategoryImageById = useMemo(() => {
        const used = new Set()
        const map = {}
        for (const cat of homeCategories) {
            const keywords = categoryMapCatalog[cat.id] || []
            const found = products.find(
                (p) =>
                    !used.has(p.id) &&
                    keywords.some(
                        (k) =>
                            p.name.toLowerCase().includes(k) ||
                            (p.category && p.category.toLowerCase().includes(k))
                    ) &&
                    p.image
            )
            if (found) used.add(found.id)
            map[cat.id] = (found?.image && displayImageUrl(found.image)) || '/assets/baner.webp'
        }
        return map
    }, [categoryMapCatalog, products, homeCategories])

    useEffect(() => {
        if (activeTab !== 'home') return
        if (homeCategoryPageCount <= 1) return
        const id = setInterval(() => {
            setHomeCategoryPage((p) => (p + 1) % homeCategoryPageCount)
        }, 5000)
        return () => clearInterval(id)
    }, [activeTab, homeCategoryPageCount])

    const goToCategory = useCallback(
        (catId) => {
            setSelectedCategory(catId)
            navigateTo('products')
        },
        // navigateTo se define más arriba en el componente
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    )

    const catalogFilteredProducts = useMemo(() => {
        let list =
            selectedCategory === 'todos'
                ? products
                : products.filter((p) => {
                      const keywords = categoryMapCatalog[selectedCategory] || []
                      return keywords.some(
                          (keyword) =>
                              p.name.toLowerCase().includes(keyword) ||
                              (p.category && p.category.toLowerCase().includes(keyword))
                      )
                  })
        const q = catalogSearch.trim().toLowerCase()
        if (q) {
            list = list.filter(
                (p) =>
                    p.name.toLowerCase().includes(q) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.description && String(p.description).toLowerCase().includes(q))
            )
        }
        return list
    }, [products, selectedCategory, catalogSearch, categoryMapCatalog])

    const catalogTotalPages = Math.max(1, Math.ceil(catalogFilteredProducts.length / CATALOG_PAGE_SIZE))
    const catalogPageSafe = Math.min(Math.max(1, catalogPage), catalogTotalPages)
    const catalogPageProducts = catalogFilteredProducts.slice(
        (catalogPageSafe - 1) * CATALOG_PAGE_SIZE,
        catalogPageSafe * CATALOG_PAGE_SIZE
    )

    useEffect(() => {
        setCatalogPage(1)
    }, [selectedCategory, catalogSearch])

    useEffect(() => {
        setCatalogPage((p) => Math.min(p, catalogTotalPages))
    }, [catalogTotalPages])

    const handleUserUpdated = useCallback((u) => {
        setUser(u)
    }, [])

    // Separar items públicos, de usuario y de admin
    const publicItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'about', label: 'Nosotros', icon: Info },
        { id: 'products', label: 'Productos', icon: Package },
        { id: 'contact', label: 'Contáctenos', icon: Phone },
    ]

    /** Menú hamburguesa — cuenta: solo perfil (cliente + Mis pedidos; admin sin pedidos aquí). */
    const accountMenuItems = user
        ? [
              { id: 'profile', label: 'Mi Perfil', icon: User },
              ...(user.role === 'cliente'
                  ? [
                        { id: 'my-orders', label: 'Mis pedidos', icon: ClipboardList },
                        { id: 'my-tickets', label: 'Mis consultas', icon: MessageSquare },
                    ]
                  : []),
          ]
        : []

    const adminAreaActive = activeTab === 'admin-panel' || ADMIN_SUB_TABS.has(activeTab)

    const adminItems =
        user?.role === 'administrador'
            ? [{ id: 'admin-panel', label: 'Administración', icon: Shield }]
            : []

    return (
        <div className="mobile-container">
            {/* Header */}
            <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 20, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backdropFilter: 'blur(20px)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Menu size={24} onClick={() => setIsMenuOpen(true)} style={{ cursor: 'pointer' }} />
                    <h1 onClick={() => navigateTo('home')} style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.5px', cursor: 'pointer' }}>
                        NUTRIMENTOS<span style={{ color: 'var(--primary-color)' }}>PAVIO</span>.
                    </h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Alerta de bajo stock (solo para admin) */}
                    {user?.role === 'administrador' && lowStockProducts.length > 0 && (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => navigateTo('admin-kardex')}
                            onKeyDown={(e) => e.key === 'Enter' && navigateTo('admin-kardex')}
                            style={{ position: 'relative', padding: '8px', cursor: 'pointer' }}
                            title={`${lowStockProducts.length} producto(s) con menos de ${LOW_STOCK_THRESHOLD} u. en stock — clic para Kardex`}
                        >
                            <AlertTriangle size={24} color="var(--accent-color)" />
                            <span style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                background: 'var(--accent-color)',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(244, 63, 94, 0.5)'
                            }}>
                                {lowStockProducts.length}
                            </span>
                        </div>
                    )}
                    {/* Icono de mensajes */}
                    <div style={{ position: 'relative', padding: '8px', cursor: 'pointer' }} onClick={() => alert('Sistema de mensajes próximamente')}>
                        <MessageCircle size={24} />
                    </div>
                    {/* Carrito */}
                    <div style={{ position: 'relative', padding: '8px', cursor: 'pointer' }} onClick={() => navigateTo('cart')}>
                        <ShoppingCart size={24} />
                        {cartCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                background: 'var(--accent-color)',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 5px rgba(244, 63, 94, 0.5)'
                            }}>
                                {cartCount}
                            </span>
                        )}
                    </div>
                </div>
            </header>

            {/* Side Menu (Drawer) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 30 }}
                            onClick={() => setIsMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            className="glass"
                            style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '80%', maxWidth: '300px', zIndex: 40, padding: '20px', background: '#050505' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Menú</h2>
                                <X size={24} onClick={() => setIsMenuOpen(false)} />
                            </div>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Items públicos */}
                                {publicItems.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => navigateTo(item.id)} 
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.1rem', padding: '10px', borderRadius: '12px', background: activeTab === item.id ? 'var(--glass-bg)' : 'transparent', color: activeTab === item.id ? 'var(--primary-color)' : 'var(--text-color)', cursor: 'pointer' }}
                                    >
                                        <item.icon size={24} />
                                        {item.label}
                                    </div>
                                ))}

                                {/* Divisor: hay más secciones después de público */}
                                {(accountMenuItems.length > 0 || adminItems.length > 0 || !user) && (
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                                )}

                                {/* Cuenta: Mi perfil + Mis pedidos (solo cliente) */}
                                {accountMenuItems.map((item) => (
                                    <div
                                        key={item.id}
                                        onClick={() => navigateTo(item.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            fontSize: '1.1rem',
                                            padding: '10px',
                                            borderRadius: '12px',
                                            background: activeTab === item.id ? 'var(--glass-bg)' : 'transparent',
                                            color: activeTab === item.id ? 'var(--primary-color)' : 'var(--text-color)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <item.icon size={24} />
                                        {item.label}
                                    </div>
                                ))}

                                {accountMenuItems.length > 0 && adminItems.length > 0 && (
                                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '10px 0' }} />
                                )}

                                {/* Administración: panel único con acceso a todos los módulos */}
                                {adminItems.length > 0 && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '0 10px' }}>
                                            <Shield size={16} color="var(--primary-color)" />
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                Administración
                                            </span>
                                        </div>
                                        {adminItems.map((item) => (
                                            <div 
                                                key={item.id} 
                                                onClick={() => navigateTo(item.id)} 
                                                style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '16px', 
                                                    fontSize: '1.1rem', 
                                                    padding: '10px', 
                                                    borderRadius: '12px', 
                                                    background: adminAreaActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.1)', 
                                                    border: adminAreaActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(99, 102, 241, 0.2)',
                                                    color: adminAreaActive ? 'var(--primary-color)' : 'var(--text-color)', 
                                                    cursor: 'pointer',
                                                    marginLeft: '8px'
                                                }}
                                            >
                                                <item.icon size={24} />
                                                {item.label}
                                            </div>
                                        ))}
                                    </>
                                )}

                                {!user && (
                                    <div 
                                        onClick={() => navigateTo('login')} 
                                        style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1.1rem', padding: '10px', borderRadius: '12px', background: activeTab === 'login' ? 'var(--glass-bg)' : 'transparent', color: activeTab === 'login' ? 'var(--primary-color)' : 'var(--text-color)', cursor: 'pointer' }}
                                    >
                                        <User size={24} />
                                        Login
                                    </div>
                                )}
                            </nav>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <main style={{ padding: '20px' }}>
                {user?.role === 'administrador' && ADMIN_SUB_TABS.has(activeTab) && (
                    <button type="button" className="admin-back-to-panel" onClick={() => navigateTo('admin-panel')}>
                        <ChevronLeft size={20} aria-hidden />
                        Panel de administración
                    </button>
                )}
                <Suspense fallback={<AppTabSuspenseFallback />}>
                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                            <HomeHeroCarousel onVerCatalogo={() => navigateTo('products')} />
                            <h3 style={{ marginBottom: '14px' }}>Destacados</h3>

                            <div
                                className="glass glass-card"
                                style={{
                                    padding: '12px',
                                    marginBottom: '32px',
                                    background: 'rgba(255,255,255,0.03)',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <button
                                        type="button"
                                        aria-label="Grupo anterior de categorías (2)"
                                        onClick={() =>
                                            setHomeCategoryPage((p) => (p - 1 + homeCategoryPageCount) % homeCategoryPageCount)
                                        }
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: 'rgba(0,0,0,0.25)',
                                            color: 'var(--primary-color)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <ChevronLeft size={22} aria-hidden />
                                    </button>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                            gap: '12px',
                                            flex: 1,
                                            minWidth: 0,
                                        }}
                                    >
                                        {homeCategoriesPageSlice.map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => goToCategory(cat.id)}
                                                className="glass"
                                                style={{
                                                    padding: 0,
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 14,
                                                    overflow: 'hidden',
                                                    cursor: 'pointer',
                                                    background: 'rgba(255,255,255,0.04)',
                                                    minWidth: 0,
                                                    WebkitTapHighlightColor: 'transparent',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        aspectRatio: '1 / 1',
                                                        backgroundImage: `url("${homeCategoryImageById[cat.id]}")`,
                                                        backgroundSize: 'cover',
                                                        backgroundPosition: 'center',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            background:
                                                                'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.68) 100%)',
                                                        }}
                                                    />
                                                    <span
                                                        style={{
                                                            position: 'absolute',
                                                            left: 8,
                                                            bottom: 8,
                                                            right: 8,
                                                            fontSize: 'clamp(0.65rem, 2.8vw, 0.82rem)',
                                                            fontWeight: 800,
                                                            letterSpacing: '0.45px',
                                                            color: '#fff',
                                                            textAlign: 'left',
                                                            lineHeight: 1.15,
                                                            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                                                        }}
                                                    >
                                                        {cat.label}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        aria-label="Siguiente grupo de categorías (2)"
                                        onClick={() => setHomeCategoryPage((p) => (p + 1) % homeCategoryPageCount)}
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 12,
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            background: 'rgba(0,0,0,0.25)',
                                            color: 'var(--primary-color)',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <ChevronRight size={22} aria-hidden />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                                    {Array.from({ length: homeCategoryPageCount }, (_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            aria-label={`Página ${i + 1} de ${homeCategoryPageCount}`}
                                            aria-current={i === homeCategoryPage ? 'true' : undefined}
                                            onClick={() => setHomeCategoryPage(i)}
                                            style={{
                                                width: i === homeCategoryPage ? 24 : 8,
                                                height: 8,
                                                borderRadius: 999,
                                                border: 'none',
                                                padding: 0,
                                                background:
                                                    i === homeCategoryPage
                                                        ? 'var(--primary-color)'
                                                        : 'rgba(255,255,255,0.28)',
                                                cursor: 'pointer',
                                                transition: 'width 0.2s, background 0.2s',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Nuestros Socios */}
                            <h3 style={{ marginBottom: '20px', fontSize: '1.5rem', color: 'var(--primary-color)' }}>Nuestros Socios</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* VITAMAX PRO */}
                                <div className="glass glass-card" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <picture>
                                                <source srcSet="/assets/socios/vitamax.webp" type="image/webp" />
                                                <img
                                                    src="/assets/socios/vitamax.jpg"
                                                    alt="Vitamax Pro"
                                                    loading="lazy"
                                                    width={200}
                                                    height={120}
                                                    sizes="200px"
                                                    decoding="async"
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                    }}
                                                />
                                            </picture>
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>VITAMAX PRO</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Nutrición balanceada y suplementos especializados para tus animales de granja
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Natural</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Fortificante</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Premium</span>
                                        </div>
                                    </div>
                                </div>

                                {/* PURINA */}
                                <div className="glass glass-card" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <picture>
                                                <source srcSet="/assets/socios/purina.webp" type="image/webp" />
                                                <img
                                                    src="/assets/socios/purina.png"
                                                    alt="Purina"
                                                    loading="lazy"
                                                    width={200}
                                                    height={120}
                                                    sizes="200px"
                                                    decoding="async"
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                    }}
                                                />
                                            </picture>
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>PURINA</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Cuidado digestivo y pelaje saludable para tus engreídos de la casa
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Hogar</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Premium</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Cuidado</span>
                                        </div>
                                    </div>
                                </div>

                                {/* ROMY */}
                                <div className="glass glass-card" style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ height: '120px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            <picture>
                                                <source srcSet="/assets/socios/romi.webp" type="image/webp" />
                                                <img
                                                    src="/assets/socios/romi.jpg"
                                                    alt="Romy"
                                                    loading="lazy"
                                                    width={200}
                                                    height={120}
                                                    sizes="200px"
                                                    decoding="async"
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none'
                                                    }}
                                                />
                                            </picture>
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>ROMY</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            Medicinas efectivas y tratamientos especializados para enfermedades
                                        </p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Veterinario</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Efectivo</span>
                                            <span style={{ padding: '6px 12px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 600 }}>Confiable</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'about' && (
                        <motion.div key="about" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>Nosotros</h2>
                            
                            {/* Imagen Principal */}
                            <div className="glass glass-card" style={{ marginBottom: '24px' }}>
                                <img
                                    src="/assets/pavio.jpeg"
                                    alt="Nutrimentos Pavio"
                                    loading="lazy"
                                    width="400"
                                    height="200"
                                    style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '16px' }}
                                />
                                <p style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '1rem' }}>
                                    En <strong style={{ color: 'var(--primary-color)' }}>Nutrimentos Pavio</strong>, nos dedicamos a ofrecer la mejor calidad en alimentación animal. Con años de experiencia, garantizamos productos que mejoran la salud y rendimiento.
                                </p>
                            </div>

                            {/* Nuestros Valores */}
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', textAlign: 'center', color: 'var(--primary-color)' }}>Nuestros Valores</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                <div className="glass glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Heart size={24} color="var(--primary-color)" fill="var(--primary-color)" />
                                        </div>
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-color)' }}>Calidad</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        Productos certificados con los mejores estándares de calidad e inocuidad alimentaria.
                                    </p>
                                </div>

                                <div className="glass glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Leaf size={24} color="#22c55e" fill="#22c55e" />
                                        </div>
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-color)' }}>Sostenibilidad</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        Comprometidos con prácticas sustentables y cuidado del medio ambiente.
                                    </p>
                                </div>

                                <div className="glass glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <UsersIcon size={24} color="#3b82f6" fill="#3b82f6" />
                                        </div>
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-color)' }}>Confianza</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        Relaciones a largo plazo basadas en transparencia y responsabilidad.
                                    </p>
                                </div>

                                <div className="glass glass-card" style={{ padding: '16px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Zap size={24} color="var(--primary-color)" fill="var(--primary-color)" />
                                        </div>
                                    </div>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--text-color)' }}>Innovación</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                        Constantemente actualizados con las últimas fórmulas y tecnologías alimentarias.
                                    </p>
                                </div>
                            </div>

                            {/* Nuestra Presencia Provincial */}
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--primary-color)' }}>Nuestra Presencia Provincial</h3>
                            <div className="glass glass-card" style={{ marginBottom: '16px' }}>
                                <p style={{ lineHeight: '1.6', color: 'var(--text-color)', marginBottom: '16px', fontSize: '0.95rem' }}>
                                    Conformamos una empresa comprometida con la calidad y el servicio, con presencia propia en toda la <strong style={{ color: 'var(--primary-color)' }}>provincia de Camaná</strong>. Nuestro compromiso es llegar a cada rincón de la provincia, brindando productos de nutrición animal de la más alta calidad a todos nuestros clientes.
                                </p>
                                <button 
                                    className="btn-primary" 
                                    onClick={() => navigateTo('contact')}
                                    style={{ width: '100%', marginTop: '8px' }}
                                >
                                    Contáctenos →
                                </button>
                            </div>

                            {/* Mapa y distritos (marcador animado al elegir; ver coordenadas en CamanaDistrictMap.jsx) */}
                            <CamanaDistrictMap />
                        </motion.div>
                    )}

                    {activeTab === 'products' && (
                        <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Catálogo</h2>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="catalog-search-label" htmlFor="catalog-search">
                                    <Search size={18} aria-hidden />
                                    <input
                                        id="catalog-search"
                                        type="search"
                                        value={catalogSearch}
                                        onChange={(e) => setCatalogSearch(e.target.value)}
                                        placeholder="Buscar por nombre, categoría o descripción…"
                                        className="catalog-search-input"
                                        autoComplete="off"
                                    />
                                </label>
                            </div>

                            {/* Categorías */}
                            <div 
                                className="hide-scrollbar"
                                style={{ 
                                    marginBottom: '20px', 
                                    marginLeft: '-20px',
                                    marginRight: '-20px',
                                    paddingLeft: '20px',
                                    paddingRight: '20px',
                                    overflowX: 'auto', 
                                    WebkitOverflowScrolling: 'touch',
                                    scrollBehavior: 'smooth'
                                }}
                            >
                                <div style={{ display: 'flex', gap: '10px', paddingBottom: '10px' }}>
                                    {[
                                        { id: 'todos', label: 'Todos', image: null },
                                        { id: 'pollos', label: 'Pollos', image: 'polloos.jpg' },
                                        { id: 'gallos', label: 'Gallos', image: 'gallos.jpg' },
                                        { id: 'ponedoras', label: 'Ponedoras', image: 'ponedoras.png' },
                                        { id: 'patos', label: 'Patos', image: 'patos.jpg' },
                                        { id: 'pavos', label: 'Pavos', image: 'pavos.jpg' },
                                        { id: 'porcinos', label: 'Porcinos', image: 'porcinoos.jpeg' },
                                        { id: 'mascotas', label: 'Mascotas', image: 'mascotas.jpg' },
                                        { id: 'medicina', label: 'Medicamentos', image: 'medicina.jpeg' }
                                    ].map((category) => (
                                        <button
                                            key={category.id}
                                            onClick={() => setSelectedCategory(category.id)}
                                            style={{
                                                padding: '10px 16px',
                                                borderRadius: '20px',
                                                border: 'none',
                                                background: selectedCategory === category.id 
                                                    ? 'var(--primary-color)' 
                                                    : 'rgba(255,255,255,0.1)',
                                                color: selectedCategory === category.id ? '#fff' : 'var(--text-color)',
                                                fontSize: '0.85rem',
                                                fontWeight: selectedCategory === category.id ? '600' : '400',
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {category.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Banner de Categoría */}
                            {selectedCategory !== 'todos' && (() => {
                                const category = [
                                    { id: 'pollos', image: 'polloos.jpg', title: 'LÍNEA POLLOS' },
                                    { id: 'gallos', image: 'gallos.jpg', title: 'LÍNEA GALLOS' },
                                    { id: 'ponedoras', image: 'ponedoras.png', title: 'LÍNEA PONEDORAS' },
                                    { id: 'patos', image: 'patos.jpg', title: 'LÍNEA PATOS' },
                                    { id: 'pavos', image: 'pavos.jpg', title: 'LÍNEA PAVOS' },
                                    { id: 'porcinos', image: 'porcinoos.jpeg', title: 'LÍNEA PORCINOS' },
                                    { id: 'mascotas', image: 'mascotas.jpg', title: 'LÍNEA MASCOTAS' },
                                    { id: 'medicina', image: 'medicina.jpeg', title: 'MEDICAMENTOS' }
                                ].find(c => c.id === selectedCategory);

                                if (category) {
                                    return (
                                        <div style={{ 
                                            position: 'relative', 
                                            height: '180px', 
                                            borderRadius: '20px', 
                                            overflow: 'hidden', 
                                            marginBottom: '20px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                                        }}>
                                            <img
                                                src={`/assets/cabeceras/${category.image}`}
                                                alt={category.title}
                                                loading="lazy"
                                                width="400"
                                                height="180"
                                                style={{ 
                                                    width: '100%', 
                                                    height: '100%', 
                                                    objectFit: 'cover'
                                                }}
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.5))',
                                                padding: '20px'
                                            }}>
                                                <h3 style={{ 
                                                    margin: 0, 
                                                    fontSize: '2rem', 
                                                    fontWeight: 'bold', 
                                                    color: '#fff',
                                                    textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 10px rgba(0,0,0,0.8)',
                                                    textAlign: 'center',
                                                    letterSpacing: '2px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {category.title}
                                                </h3>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}

                            {/* Productos (paginación + búsqueda) */}
                            {catalogFilteredProducts.length === 0 ? (
                                <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                                        {catalogSearch.trim()
                                            ? 'No hay resultados para tu búsqueda.'
                                            : 'No hay productos disponibles en esta categoría.'}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {catalogPageProducts.map((product) => (
                                            <div key={product.id} className="glass glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                                                <ProductImageDetailTrigger product={product} onOpen={setDetailProduct} height={140} />
                                                <div style={{ padding: '12px' }}>
                                                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 5px 0' }}>{product.name}</h3>
                                                    <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0 0 8px 0' }}>S/ {parseFloat(product.price).toFixed(2)}</p>
                                                    <button
                                                        className="btn-primary"
                                                        style={{ width: '100%', fontSize: '0.8rem', padding: '8px', marginTop: '8px' }}
                                                        onClick={() => addToCart(product)}
                                                    >
                                                        Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <PaginationBar
                                        page={catalogPageSafe}
                                        totalPages={catalogTotalPages}
                                        onPageChange={setCatalogPage}
                                    />
                                </>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'contact' && (
                        <motion.div key="contact" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Contáctenos</h2>
                            <form
                                className="glass glass-card contact-page-form-wrap"
                                onSubmit={handleContactSubmit}
                                style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '24px' }}
                            >
                                {user && (
                                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                        Nombre y correo se toman de tu cuenta y no se pueden editar aquí.
                                    </p>
                                )}
                                <div>
                                    <label className="contact-form-label" htmlFor="contact-fullname">
                                        Nombres y Apellidos
                                    </label>
                                    <input
                                        id="contact-fullname"
                                        type="text"
                                        className={`contact-form-field${user ? ' contact-form-field--locked' : ''}`}
                                        placeholder="Ingresa tus nombres y apellidos"
                                        value={contactFullName}
                                        readOnly={!!user}
                                        onChange={(e) => {
                                            if (!user) setContactFullName(e.target.value)
                                        }}
                                        autoComplete="name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="contact-form-label" htmlFor="contact-email">
                                        Correo
                                    </label>
                                    <input
                                        id="contact-email"
                                        type="email"
                                        className={`contact-form-field${user ? ' contact-form-field--locked' : ''}`}
                                        placeholder="Ingresa tu correo electrónico"
                                        value={contactEmail}
                                        readOnly={!!user}
                                        onChange={(e) => {
                                            if (!user) setContactEmail(e.target.value)
                                        }}
                                        autoComplete="email"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="contact-form-label" htmlFor="contact-asunto">
                                        Asunto
                                    </label>
                                    <CustomSelect
                                        id="contact-asunto"
                                        value={contactAsunto}
                                        onChange={setContactAsunto}
                                        options={CONTACT_ASUNTO_OPTIONS}
                                        placeholder="Selecciona un asunto"
                                    />
                                </div>

                                {contactAsunto === 'QUEJA' && !user && (
                                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        Para asociar una queja a un pedido debes{' '}
                                        <button
                                            type="button"
                                            className="btn-primary"
                                            style={{ padding: '6px 12px', fontSize: '0.85rem', verticalAlign: 'baseline' }}
                                            onClick={() => navigateTo('login')}
                                        >
                                            iniciar sesión
                                        </button>
                                        .
                                    </p>
                                )}

                                {contactAsunto === 'QUEJA' && user && (
                                    <div>
                                        <label className="contact-form-label" htmlFor="contact-order">
                                            Pedido relacionado
                                        </label>
                                        {contactOrdersLoading ? (
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Cargando tus pedidos…</p>
                                        ) : contactOrders.length === 0 ? (
                                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                No tienes pedidos registrados. No puedes enviar una queja vinculada a un pedido aún.
                                            </p>
                                        ) : (
                                            <CustomSelect
                                                id="contact-order"
                                                value={contactOrderId}
                                                onChange={setContactOrderId}
                                                options={contactOrders.map((o) => ({
                                                    value: String(o.id),
                                                    label: `Pedido #${o.id} · ${new Date(o.createdAt).toLocaleDateString('es-PE')} · S/ ${parseFloat(o.total).toFixed(2)}`,
                                                }))}
                                                placeholder="Selecciona un pedido"
                                            />
                                        )}
                                        {contactOrderId ? (
                                            <div style={{ marginTop: '14px' }}>
                                                <label className="contact-form-label" htmlFor="contact-queja-detail">
                                                    Describe tu queja sobre este pedido
                                                </label>
                                                <textarea
                                                    id="contact-queja-detail"
                                                    className="contact-form-field contact-form-textarea"
                                                    placeholder="Explica qué ocurrió y qué necesitas…"
                                                    value={contactQuejaText}
                                                    onChange={(e) => setContactQuejaText(e.target.value)}
                                                    rows={5}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                )}

                                {(contactAsunto === 'CONSULTA' || contactAsunto === 'OTRO') && (
                                    <div>
                                        <label className="contact-form-label" htmlFor="contact-mensaje">
                                            Mensaje
                                        </label>
                                        <textarea
                                            id="contact-mensaje"
                                            className="contact-form-field contact-form-textarea"
                                            placeholder="Escribe tu mensaje aquí…"
                                            value={contactMensaje}
                                            onChange={(e) => setContactMensaje(e.target.value)}
                                            rows={6}
                                        />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ width: '100%', marginTop: '4px' }}
                                    disabled={
                                        contactSubmitting ||
                                        (contactAsunto === 'QUEJA' &&
                                            (!user || contactOrdersLoading || (!contactOrdersLoading && contactOrders.length === 0)))
                                    }
                                >
                                    {contactSubmitting ? 'Enviando…' : 'Enviar mensaje'}
                                </button>
                            </form>
                            <div
                                className="glass glass-card contact-page-location-wrap"
                                style={{ marginTop: '24px', padding: '16px', overflow: 'visible' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <MapPin size={22} color="var(--primary-color)" aria-hidden />
                                    <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Ubicación</h3>
                                </div>
                                <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                                    <iframe
                                        title="Ubicación Nutrimentos Pavio"
                                        src="https://www.google.com/maps?q=-16.62058543638781,-72.7104411714537&z=17&hl=es&output=embed"
                                        style={{ width: '100%', height: 'min(280px, 50vh)', border: 'none', display: 'block' }}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    />
                                </div>
                                <a
                                    href="https://www.google.com/maps/search/?api=1&query=-16.62058543638781,-72.7104411714537"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: 'inline-block', marginTop: '12px', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 600 }}
                                >
                                    Abrir en Google Maps →
                                </a>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'login' && (
                        <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', textAlign: 'center' }}>Bienvenido</h2>
                            {user ? (
                                <div className="glass glass-card" style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                                    <p style={{ marginBottom: '16px' }}>Hola, <strong>{user.names} {user.surnames}</strong></p>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '8px' }}>{user.email}</p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px', lineHeight: 1.45 }}>
                                        Mi perfil y pedidos están en el menú <strong>☰</strong>.
                                    </p>
                                    <button type="button" className="btn-primary" onClick={handleLogout} style={{ background: 'var(--accent-color)', width: '100%' }}>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            ) : (
                                <div className="glass glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                                    {loginError && (
                                        <div style={{ 
                                            padding: '12px', 
                                            borderRadius: '8px', 
                                            background: 'rgba(244, 63, 94, 0.2)', 
                                            color: 'var(--accent-color)', 
                                            fontSize: '0.9rem'
                                        }}>
                                            {loginError}
                                        </div>
                                    )}
                                    <input 
                                        type="email" 
                                        placeholder="Correo Electrónico" 
                                        value={loginData.email}
                                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }} 
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type={loginShowPassword ? 'text' : 'password'} 
                                            placeholder="Contraseña" 
                                            value={loginData.password}
                                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                            style={{ padding: '12px', paddingRight: '44px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', width: '100%' }} 
                                        />
                                        <button
                                            type="button"
                                            aria-label={loginShowPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => setLoginShowPassword((v) => !v)}
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                right: '10px',
                                                transform: 'translateY(-50%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'rgba(255,255,255,0.85)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {loginShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <button 
                                        className="btn-primary" 
                                        style={{ background: 'var(--primary-color)', opacity: loading ? 0.7 : 1 }}
                                        onClick={handleLogin}
                                        disabled={loading}
                                    >
                                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                                    </button>
                                    <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>¿No tienes cuenta? <span onClick={() => navigateTo('register')} style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}>Regístrate</span></p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'profile' && user && (
                        <Profile onUserUpdated={handleUserUpdated} />
                    )}

                    {activeTab === 'my-orders' && user && user.role === 'cliente' && <MyOrders />}
                    {activeTab === 'my-tickets' && user && user.role === 'cliente' && <MyContactTickets />}

                    {activeTab === 'register' && (
                        <Register onNavigate={navigateTo} />
                    )}

                    {activeTab === 'admin-panel' && user?.role === 'administrador' && (
                        <motion.div
                            key="admin-panel"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            <AdminPanel onNavigate={navigateTo} lowStockCount={lowStockProducts.length} />
                        </motion.div>
                    )}

                    {activeTab === 'admin-products' && (
                        <motion.div key="admin-products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AdminProducts />
                        </motion.div>
                    )}

                    {activeTab === 'admin-users' && (
                        <motion.div key="admin-users" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AdminUsers />
                        </motion.div>
                    )}

                    {activeTab === 'admin-kardex' && (
                        <motion.div key="admin-kardex" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AdminKardex />
                        </motion.div>
                    )}

                    {activeTab === 'admin-contact-tickets' && user?.role === 'administrador' && (
                        <motion.div key="admin-contact-tickets" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AdminContactTickets />
                        </motion.div>
                    )}
                    {activeTab === 'admin-orders' && (
                        <motion.div key="admin-orders" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <AdminOrders />
                        </motion.div>
                    )}

                    {activeTab === 'cart' && (
                        <motion.div key="cart" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Tu Carrito</h2>
                            {cart.length === 0 ? (
                                <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Tu carrito está vacío</p>
                                    <button className="btn-primary" onClick={() => navigateTo('products')}>
                                        Ver Productos
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {cart.map((item) => (
                                        <div key={item.id} className="glass glass-card" style={{ marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            <div style={{ width: '60px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
                                                <ProductImageDetailTrigger product={item} onOpen={setDetailProduct} height={60} compact />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem' }}>{item.name}</h3>
                                                <p style={{ margin: '0 0 8px 0', color: 'var(--primary-color)' }}>S/ {parseFloat(item.price).toFixed(2)}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                                                    >
                                                        -
                                                    </button>
                                                    <span style={{ minWidth: '30px', textAlign: 'center' }}>{item.quantity}</span>
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer' }}
                                                    >
                                                        +
                                                    </button>
                                                    <button 
                                                        onClick={() => removeFromCart(item.id)}
                                                        style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: '6px', border: 'none', background: 'rgba(244, 63, 94, 0.2)', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="glass glass-card" style={{ marginTop: '20px', padding: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                            <span>Total:</span>
                                            <span style={{ color: 'var(--primary-color)' }}>S/ {getCartTotal().toFixed(2)}</span>
                                        </div>
                                        <button 
                                            className="btn-primary" 
                                            style={{ width: '100%', background: 'var(--accent-color)' }}
                                            onClick={() => {
                                                if (!user) {
                                                    alert('Por favor inicia sesión para continuar')
                                                    navigateTo('login')
                                                } else {
                                                    setCheckoutOpen(true)
                                                }
                                            }}
                                        >
                                            {user ? 'Pagar Ahora' : 'Iniciar Sesión para Pagar'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                </Suspense>
            </main>

            <AnimatePresence>
                {detailProduct ? (
                    <ProductDetailModal
                        key={detailProduct.id}
                        product={detailProduct}
                        resolveProduct={resolveDetailProduct}
                        onClose={() => setDetailProduct(null)}
                        onAddToCart={addToCart}
                    />
                ) : null}
            </AnimatePresence>

            <Suspense fallback={null}>
                <CheckoutModal
                    open={checkoutOpen}
                    onClose={() => setCheckoutOpen(false)}
                    cart={cart}
                    total={getCartTotal()}
                    user={user}
                    onSuccess={clearCart}
                />
            </Suspense>

            <a
                href="https://wa.me/51999390141?text=Hola%2C%20quisiera%20hacer%20una%20consulta%20sobre%20sus%20productos%20%28Nutrimentos%20Pavio%29."
                target="_blank"
                rel="noopener noreferrer"
                className="whatsapp-fab"
                aria-label="Consultar por WhatsApp al 999 390 141"
                title="WhatsApp — consulta"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </a>

            {/* Bottom Navigation */}
            <nav className="glass" style={{ position: 'fixed', bottom: 20, left: 20, right: 20, borderRadius: '24px', padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                <Home size={24} color={activeTab === 'home' ? 'var(--primary-color)' : 'var(--text-muted)'} onClick={() => navigateTo('home')} />
                <Package size={24} color={activeTab === 'products' ? 'var(--primary-color)' : 'var(--text-muted)'} onClick={() => navigateTo('products')} />
                <User size={24} color={activeTab === 'login' ? 'var(--primary-color)' : 'var(--text-muted)'} onClick={() => navigateTo('login')} />
            </nav>
        </div>
    )
}

export default App
