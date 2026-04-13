import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Loader2, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { authAPI } from '../services/api'

const inputStyle = {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    width: '100%',
}

function AccordionSection({ id, title, open, onToggle, children }) {
    return (
        <div className="glass glass-card profile-accordion">
            <button
                type="button"
                className="profile-accordion-trigger"
                onClick={() => onToggle(id)}
                aria-expanded={open}
                aria-controls={`accordion-panel-${id}`}
                id={`accordion-header-${id}`}
            >
                <span>{title}</span>
                <ChevronDown
                    size={22}
                    aria-hidden
                    strokeWidth={2.2}
                    style={{
                        flexShrink: 0,
                        opacity: 0.9,
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.25s ease',
                    }}
                />
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        id={`accordion-panel-${id}`}
                        role="region"
                        aria-labelledby={`accordion-header-${id}`}
                        className="profile-accordion-body"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                        style={{ overflow: 'hidden' }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default function Profile({ onUserUpdated }) {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [profileMsg, setProfileMsg] = useState('')
    const [passwordMsg, setPasswordMsg] = useState('')
    const [openSection, setOpenSection] = useState('personal')

    const [form, setForm] = useState({
        names: '',
        surnames: '',
        email: '',
        phone: '',
        address: '',
    })
    const [savingProfile, setSavingProfile] = useState(false)

    const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
    const [savingPwd, setSavingPwd] = useState(false)
    const [showCurrent, setShowCurrent] = useState(false)
    const [showNext, setShowNext] = useState(false)

    const load = useCallback(async () => {
        setError('')
        setLoading(true)
        try {
            const { user } = await authAPI.getProfile()
            setForm({
                names: user.names || '',
                surnames: user.surnames || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
            })
            if (onUserUpdated) onUserUpdated(user)
        } catch (e) {
            setError(e.message || 'No se pudo cargar el perfil')
        } finally {
            setLoading(false)
        }
    }, [onUserUpdated])

    useEffect(() => {
        load()
    }, [load])

    const toggleSection = (id) => {
        setOpenSection((prev) => (prev === id ? null : id))
    }

    const handleNameChange = (e, field) => {
        const val = e.target.value
        const capitalized = val.replace(/\b\w/g, (c) => c.toUpperCase())
        setForm((f) => ({ ...f, [field]: capitalized }))
    }

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, '').slice(0, 9)
        setForm((f) => ({ ...f, phone: val }))
    }

    const saveProfile = async (e) => {
        e.preventDefault()
        setProfileMsg('')
        setSavingProfile(true)
        try {
            const { user } = await authAPI.updateProfile({
                names: form.names.trim(),
                surnames: form.surnames.trim(),
                email: form.email.trim(),
                phone: form.phone,
                address: form.address.trim(),
            })
            localStorage.setItem('user', JSON.stringify(user))
            if (onUserUpdated) onUserUpdated(user)
            setProfileMsg('Datos guardados correctamente.')
        } catch (err) {
            setProfileMsg(err.message || 'Error al guardar')
        } finally {
            setSavingProfile(false)
        }
    }

    const savePassword = async (e) => {
        e.preventDefault()
        setPasswordMsg('')
        if (pwd.next !== pwd.confirm) {
            setPasswordMsg('La nueva contraseña y la confirmación no coinciden.')
            return
        }
        setSavingPwd(true)
        try {
            await authAPI.changePassword(pwd.current, pwd.next)
            setPwd({ current: '', next: '', confirm: '' })
            setPasswordMsg('Contraseña actualizada.')
        } catch (err) {
            setPasswordMsg(err.message || 'No se pudo cambiar la contraseña')
        } finally {
            setSavingPwd(false)
        }
    }

    if (loading) {
        return (
            <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
                <div className="glass glass-card" style={{ textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Loader2 size={28} aria-hidden className="checkout-spin" />
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>Cargando perfil…</p>
                </div>
            </motion.div>
        )
    }

    return (
        <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={28} aria-hidden />
                Mi perfil
            </h2>

            {error && (
                <div className="glass glass-card" style={{ marginBottom: '16px', color: 'var(--accent-color)', padding: '14px' }}>
                    {error}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <AccordionSection id="personal" title="Datos personales" open={openSection === 'personal'} onToggle={toggleSection}>
                    <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <input
                            type="text"
                            placeholder="Nombres"
                            value={form.names}
                            onChange={(e) => handleNameChange(e, 'names')}
                            style={inputStyle}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Apellidos"
                            value={form.surnames}
                            onChange={(e) => handleNameChange(e, 'surnames')}
                            style={inputStyle}
                            required
                        />
                        <input
                            type="email"
                            placeholder="Correo electrónico"
                            value={form.email}
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            style={inputStyle}
                            required
                        />
                        <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Teléfono (9 dígitos)"
                            value={form.phone}
                            onChange={handlePhoneChange}
                            style={inputStyle}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Dirección"
                            value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            style={inputStyle}
                            required
                        />
                        {profileMsg && (
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.9rem',
                                    color: profileMsg === 'Datos guardados correctamente.' ? '#86efac' : 'var(--accent-color)',
                                }}
                            >
                                {profileMsg}
                            </p>
                        )}
                        <button type="submit" className="btn-primary" disabled={savingProfile} style={{ opacity: savingProfile ? 0.8 : 1 }}>
                            {savingProfile ? 'Guardando…' : 'Guardar datos'}
                        </button>
                    </form>
                </AccordionSection>

                <AccordionSection id="password" title="Cambiar contraseña" open={openSection === 'password'} onToggle={toggleSection}>
                    <form onSubmit={savePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                placeholder="Contraseña actual"
                                value={pwd.current}
                                onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))}
                                style={{ ...inputStyle, paddingRight: '44px' }}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                aria-label={showCurrent ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowCurrent((v) => !v)}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '10px',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.85)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                }}
                            >
                                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNext ? 'text' : 'password'}
                                placeholder="Nueva contraseña"
                                value={pwd.next}
                                onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                                style={{ ...inputStyle, paddingRight: '44px' }}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                aria-label={showNext ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => setShowNext((v) => !v)}
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    right: '10px',
                                    transform: 'translateY(-50%)',
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255,255,255,0.85)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                }}
                            >
                                {showNext ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <input
                            type="password"
                            placeholder="Confirmar nueva contraseña"
                            value={pwd.confirm}
                            onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                            style={inputStyle}
                            autoComplete="new-password"
                        />
                        {passwordMsg && (
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: '0.9rem',
                                    color: passwordMsg.includes('incorrecta') || passwordMsg.includes('no coinciden') ? 'var(--accent-color)' : '#86efac',
                                }}
                            >
                                {passwordMsg}
                            </p>
                        )}
                        <button type="submit" className="btn-primary" disabled={savingPwd} style={{ background: 'var(--accent-color)', opacity: savingPwd ? 0.8 : 1 }}>
                            {savingPwd ? 'Actualizando…' : 'Actualizar contraseña'}
                        </button>
                    </form>
                </AccordionSection>
            </div>
        </motion.div>
    )
}
