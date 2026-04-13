import { useState, useEffect } from 'react'
import { User, Phone, MapPin, Mail, Lock, Shield } from 'lucide-react'
import { motion } from 'framer-motion'
import { authAPI, getApiUrl } from '../services/api'

export default function Register({ onNavigate }) {
    const [formData, setFormData] = useState({
        names: '',
        surnames: '',
        email: '',
        address: '',
        phone: '',
        password: '',
        role: 'cliente'
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [hasAdmin, setHasAdmin] = useState(true) // Por defecto true para no mostrar el selector hasta verificar
    const [checkingAdmin, setCheckingAdmin] = useState(true)

    const handleNameChange = (e, field) => {
        // Auto-capitalize first letter of each word
        const val = e.target.value
        const capitalized = val.replace(/\b\w/g, char => char.toUpperCase())
        setFormData({ ...formData, [field]: capitalized })
    }

    const handlePhoneChange = (e) => {
        // Only numbers, max 9 digits
        const val = e.target.value.replace(/\D/g, '').slice(0, 9)
        setFormData({ ...formData, phone: val })
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    // Verificar si ya existe un administrador
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const response = await fetch(`${getApiUrl()}/auth/check-admin`)
                const data = await response.json()
                setHasAdmin(data.hasAdmin)
            } catch (err) {
                console.error('Error al verificar admin:', err)
                setHasAdmin(true) // Si hay error, asumir que ya existe admin por seguridad
            } finally {
                setCheckingAdmin(false)
            }
        }
        checkAdmin()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Si ya existe admin, forzar rol cliente
            const dataToSend = { ...formData }
            if (hasAdmin) {
                dataToSend.role = 'cliente'
            }

            const response = await authAPI.register(dataToSend)
            
            // Guardar token y usuario
            if (response.token) {
                localStorage.setItem('token', response.token)
                localStorage.setItem('user', JSON.stringify(response.user))
            }
            
            // Si se registró como admin, actualizar el estado
            if (response.user.role === 'administrador') {
                setHasAdmin(true)
            }
            
            alert('¡Registro exitoso!')
            onNavigate('login')
        } catch (err) {
            setError(err.message || 'Error al registrar usuario')
            console.error('Error en registro:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="glass glass-card"
            style={{ maxWidth: '400px', margin: '0 auto' }}
        >
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', textAlign: 'center' }}>Crear Cuenta</h2>
            {error && (
                <div style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: 'rgba(244, 63, 94, 0.2)', 
                    color: 'var(--accent-color)', 
                    marginBottom: '16px',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Names */}
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        name="names"
                        placeholder="Nombres"
                        value={formData.names}
                        onChange={(e) => handleNameChange(e, 'names')}
                        required
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Surnames */}
                <div style={{ position: 'relative' }}>
                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        name="surnames"
                        placeholder="Apellidos"
                        value={formData.surnames}
                        onChange={(e) => handleNameChange(e, 'surnames')}
                        required
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Email */}
                <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="email"
                        name="email"
                        placeholder="Correo Electrónico"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Phone */}
                <div style={{ position: 'relative' }}>
                    <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        name="phone"
                        placeholder="Teléfono (9 dígitos)"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        required
                        pattern="\d{9}"
                        title="Debe tener 9 dígitos"
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Address */}
                <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        name="address"
                        placeholder="Dirección"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Password */}
                <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="password"
                        name="password"
                        placeholder="Contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    />
                </div>

                {/* Selector de Rol - Solo si NO existe admin (layout en fila: evita solape icono/texto en móvil) */}
                {!checkingAdmin && !hasAdmin && (
                    <div>
                        <label
                            htmlFor="register-role"
                            style={{
                                display: 'block',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                marginBottom: '8px',
                                letterSpacing: '0.04em',
                                textTransform: 'uppercase',
                            }}
                        >
                            Tipo de cuenta
                        </label>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                minHeight: '52px',
                                paddingLeft: '14px',
                                paddingRight: '42px',
                                borderRadius: '12px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                position: 'relative',
                                boxSizing: 'border-box',
                            }}
                        >
                            <Shield
                                size={22}
                                style={{ flexShrink: 0, color: 'var(--text-muted)' }}
                                aria-hidden
                            />
                            <select
                                id="register-role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#fff',
                                    fontSize: '16px',
                                    lineHeight: 1.35,
                                    padding: '14px 0',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    appearance: 'none',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'none',
                                }}
                            >
                                <option value="cliente" style={{ background: '#1a1a1e', color: '#fff' }}>
                                    Cliente
                                </option>
                                <option value="administrador" style={{ background: '#1a1a1e', color: '#fff' }}>
                                    Administrador
                                </option>
                            </select>
                            <span
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    pointerEvents: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '11px',
                                    lineHeight: 1,
                                }}
                                aria-hidden
                            >
                                ▼
                            </span>
                        </div>
                        <div style={{ 
                            padding: '10px 12px', 
                            borderRadius: '8px', 
                            background: 'rgba(99, 102, 241, 0.15)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            fontSize: '0.8rem', 
                            color: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Shield size={16} style={{ flexShrink: 0 }} />
                            <span style={{ lineHeight: '1.4' }}>Solo el primer usuario puede ser administrador</span>
                        </div>
                    </div>
                )}

                <button 
                    className="btn-primary" 
                    style={{ background: 'var(--accent-color)', marginTop: '10px', opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                >
                    {loading ? 'Registrando...' : 'Registrarme'}
                </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '20px' }}>
                ¿Ya tienes cuenta? <span onClick={() => onNavigate('login')} style={{ color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}>Inicia Sesión</span>
            </p>
        </motion.div>
    )
}
