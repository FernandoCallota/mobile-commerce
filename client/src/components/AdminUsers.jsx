import { useState, useEffect, useCallback } from 'react'
import { User, Plus, Edit, Trash2, Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { adminAPI } from '../services/adminAPI'

export default function AdminUsers() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({
        names: '',
        surnames: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        role: 'cliente'
    })

    const resetForm = useCallback(() => {
        setFormData({
            names: '',
            surnames: '',
            email: '',
            phone: '',
            address: '',
            password: '',
            role: 'cliente'
        })
        setEditingUser(null)
    }, [])

    useEffect(() => {
        loadUsers()
    }, [])

    // Auto-refresco (evita F5): mientras está abierto y sin modal.
    useEffect(() => {
        const tick = async () => {
            if (document.visibilityState !== 'visible') return
            if (showModal) return
            await loadUsers()
        }
        const id = setInterval(tick, 30000)
        document.addEventListener('visibilitychange', tick)
        window.addEventListener('focus', tick)
        return () => {
            clearInterval(id)
            document.removeEventListener('visibilitychange', tick)
            window.removeEventListener('focus', tick)
        }
    }, [showModal])

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

    const loadUsers = async () => {
        try {
            setLoading(true)
            const data = await adminAPI.getAllUsers()
            setUsers(data)
            setError('')
        } catch (err) {
            setError(err.message || 'Error al cargar usuarios')
            console.error('Error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        try {
            if (editingUser) {
                // Actualizar usuario
                const updateData = { ...formData }
                if (!updateData.password) {
                    delete updateData.password
                }
                await adminAPI.updateUser(editingUser.id, updateData)
            } else {
                // Crear usuario
                await adminAPI.createUser(formData)
            }
            
            await loadUsers()
            resetForm()
            setShowModal(false)
        } catch (err) {
            setError(err.message || 'Error al guardar usuario')
        }
    }

    const handleEdit = (user) => {
        setEditingUser(user)
        setFormData({
            names: user.names,
            surnames: user.surnames,
            email: user.email,
            phone: user.phone,
            address: user.address,
            password: '',
            role: user.role
        })
        setShowModal(true)
    }

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) {
            return
        }

        try {
            await adminAPI.deleteUser(id)
            await loadUsers()
        } catch (err) {
            setError(err.message || 'Error al eliminar usuario')
        }
    }

    const handleNewUser = () => {
        resetForm()
        setShowModal(true)
    }

    const filteredUsers = users.filter(user => {
        const search = searchTerm.toLowerCase()
        return (
            user.names.toLowerCase().includes(search) ||
            user.surnames.toLowerCase().includes(search) ||
            user.email.toLowerCase().includes(search) ||
            user.phone.includes(search)
        )
    })

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--text-muted)' }}>Cargando usuarios...</p>
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Gestión de Clientes</h2>
                <button className="btn-primary" onClick={handleNewUser} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={20} />
                    Nuevo Cliente
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
                    placeholder="Buscar por nombre, email o teléfono..."
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

            {/* Lista de usuarios */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredUsers.length === 0 ? (
                    <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                        <p style={{ color: 'var(--text-muted)' }}>No se encontraron usuarios</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <div key={user.id} className="glass glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <User size={20} color="var(--primary-color)" />
                                    <h3 style={{ margin: 0, fontSize: '1rem' }}>
                                        {user.names} {user.surnames}
                                    </h3>
                                    <span style={{ 
                                        padding: '4px 8px', 
                                        borderRadius: '6px', 
                                        fontSize: '0.75rem',
                                        background: user.role === 'administrador' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        color: user.role === 'administrador' ? 'var(--primary-color)' : 'var(--text-muted)'
                                    }}>
                                        {user.role}
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{user.email}</p>
                                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>📞 {user.phone}</p>
                                <p style={{ margin: '4px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>📍 {user.address}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => handleEdit(user)}
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
                                    onClick={() => handleDelete(user.id)}
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
                    ))
                )}
            </div>

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
                                    maxWidth: '500px', 
                                    width: '100%',
                                    maxHeight: '90vh',
                                    overflow: 'auto'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                                        {editingUser ? 'Editar Cliente' : 'Nuevo Cliente'}
                                    </h2>
                                    <button
                                        onClick={() => {
                                            setShowModal(false)
                                            resetForm()
                                        }}
                                        style={{ 
                                            background: 'transparent', 
                                            border: 'none', 
                                            color: 'var(--text-color)', 
                                            cursor: 'pointer' 
                                        }}
                                    >
                                        <X size={24} />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <input
                                            type="text"
                                            placeholder="Nombres"
                                            value={formData.names}
                                            onChange={(e) => setFormData({ ...formData, names: e.target.value })}
                                            required
                                            style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                        />
                                        <input
                                            type="text"
                                            placeholder="Apellidos"
                                            value={formData.surnames}
                                            onChange={(e) => setFormData({ ...formData, surnames: e.target.value })}
                                            required
                                            style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                        />
                                    </div>

                                    <input
                                        type="email"
                                        placeholder="Correo Electrónico"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                    />

                                    <input
                                        type="text"
                                        placeholder="Teléfono (9 dígitos)"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                                        required
                                        pattern="\d{9}"
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                    />

                                    <input
                                        type="text"
                                        placeholder="Dirección"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        required
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                    />

                                    <input
                                        type="password"
                                        placeholder={editingUser ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required={!editingUser}
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                    />

                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        style={{ padding: '12px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                    >
                                        <option value="cliente">Cliente</option>
                                        <option value="administrador">Administrador</option>
                                    </select>

                                    <button className="btn-primary" type="submit">
                                        {editingUser ? 'Actualizar' : 'Crear'} Cliente
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

