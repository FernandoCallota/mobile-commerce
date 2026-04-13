import { Truck, MessageSquare, Package, Users, FileText, ChevronRight, AlertTriangle, Shield, Tags } from 'lucide-react'

const MODULES = [
    {
        id: 'admin-orders',
        title: 'Pedidos',
        description: 'Listar pedidos, cambiar estados y revisar comprobantes.',
        icon: Truck,
    },
    {
        id: 'admin-contact-tickets',
        title: 'Consultas y quejas',
        description: 'Responder mensajes de clientes y actualizar el seguimiento.',
        icon: MessageSquare,
    },
    {
        id: 'admin-products',
        title: 'Productos',
        description: 'Alta, edición y baja del catálogo e inventario.',
        icon: Package,
    },
    {
        id: 'admin-categories',
        title: 'Categorías',
        description: 'Gestionar líneas de producto, cabeceras y palabras clave.',
        icon: Tags,
    },
    {
        id: 'admin-users',
        title: 'Clientes y usuarios',
        description: 'Crear y administrar cuentas (clientes y roles).',
        icon: Users,
    },
    {
        id: 'admin-kardex',
        title: 'Kardex',
        description: 'Movimientos de inventario y alertas de stock bajo.',
        icon: FileText,
        stockBadge: true,
    },
]

/**
 * Punto de entrada del administrador: acceso a todos los módulos de gestión.
 */
export default function AdminPanel({ onNavigate, lowStockCount = 0 }) {
    return (
        <div className="admin-panel-root">
            <div className="admin-panel-hero glass glass-card">
                <div className="admin-panel-hero-icon" aria-hidden>
                    <Shield size={32} strokeWidth={1.75} />
                </div>
                <div>
                    <h1 className="admin-panel-title">Panel de administración</h1>
                    <p className="admin-panel-subtitle">
                        Elige un módulo para gestionar pedidos, mensajes, catálogo, usuarios o inventario.
                    </p>
                </div>
            </div>

            <ul className="admin-panel-grid" role="list">
                {MODULES.map((m) => {
                    const Icon = m.icon
                    const showStock = m.stockBadge && lowStockCount > 0
                    return (
                        <li key={m.id}>
                            <button
                                type="button"
                                className="admin-panel-card glass glass-card"
                                onClick={() => onNavigate(m.id)}
                            >
                                <span className="admin-panel-card-icon" aria-hidden>
                                    <Icon size={26} strokeWidth={1.75} />
                                </span>
                                <span className="admin-panel-card-text">
                                    <span className="admin-panel-card-title">{m.title}</span>
                                    <span className="admin-panel-card-desc">{m.description}</span>
                                </span>
                                {showStock && (
                                    <span className="admin-panel-stock-pill" title="Productos con stock bajo">
                                        <AlertTriangle size={14} aria-hidden />
                                        {lowStockCount}
                                    </span>
                                )}
                                <ChevronRight className="admin-panel-card-chevron" size={22} aria-hidden />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
