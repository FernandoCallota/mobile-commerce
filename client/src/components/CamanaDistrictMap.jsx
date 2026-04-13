import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin } from 'lucide-react'

/**
 * Zona ROJA del JPG = solo provincia Camaná (franja costera). Los beige son otras provincias:
 * todos los pines deben quedar dentro de este recorte (% sobre la imagen completa).
 */
const CAMANA_ROJO_BBOX = { minX: 40, maxX: 58, minY: 40, maxY: 70 }

/**
 * Posiciones solo dentro del polígono rojo (distritos de Camaná). Orden aprox. costa N→S.
 * Si algún pin se desalinea con tu mapa.jpg, ajusta x,y pero sin salir del bbox.
 */
const DISTRITOS = [
    { label: 'Camaná', x: 49, y: 52 },
    { label: 'Mariano Nicolás Valcárcel', x: 55, y: 66 },
    { label: 'Mariscal Cáceres', x: 51, y: 54 },
    { label: 'Ocoña', x: 45, y: 46 },
    { label: 'Nicolás de Piérola', x: 52, y: 58 },
    { label: 'Quilca', x: 42, y: 42 },
    { label: 'Samuel Pastor', x: 53, y: 62 },
    { label: 'José María Químper', x: 50, y: 60 },
].map((d) => ({
    ...d,
    x: Math.min(CAMANA_ROJO_BBOX.maxX, Math.max(CAMANA_ROJO_BBOX.minX, d.x)),
    y: Math.min(CAMANA_ROJO_BBOX.maxY, Math.max(CAMANA_ROJO_BBOX.minY, d.y)),
}))

export default function CamanaDistrictMap() {
    const mapSectionRef = useRef(null)
    const [active, setActive] = useState(null)

    useEffect(() => {
        if (!active) return
        const el = mapSectionRef.current
        if (!el) return
        const t = window.setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }, 120)
        return () => clearTimeout(t)
    }, [active])

    const markerPos = DISTRITOS.find((d) => d.label === active)

    return (
        <div className="glass glass-card" ref={mapSectionRef}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <MapPin size={20} color="var(--primary-color)" aria-hidden />
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Provincia de Camaná</h4>
            </div>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                Toca un distrito: el marcador aparece solo sobre la zona <strong style={{ color: 'var(--accent-color)' }}>roja</strong> (provincia Camaná). Toca de nuevo el mismo para ocultarlo.
            </p>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                }}
            >
                <img
                    src="/assets/mapa.jpg"
                    alt="Mapa de la provincia de Camaná con distritos"
                    loading="lazy"
                    width={400}
                    height={300}
                    style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <AnimatePresence>
                    {markerPos && (
                        <motion.div
                            key={markerPos.label}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                            style={{
                                position: 'absolute',
                                left: `${markerPos.x}%`,
                                top: `${markerPos.y}%`,
                                transform: 'translate(-50%, -50%)',
                                pointerEvents: 'none',
                                zIndex: 2,
                            }}
                            aria-hidden
                        >
                            <motion.div
                                animate={{
                                    boxShadow: [
                                        '0 0 0 0 rgba(129, 140, 248, 0.55)',
                                        '0 0 0 14px rgba(129, 140, 248, 0)',
                                        '0 0 0 0 rgba(129, 140, 248, 0)',
                                    ],
                                }}
                                transition={{ duration: 1, times: [0, 0.4, 1] }}
                                style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: 'var(--primary-color)',
                                    border: '2px solid #fff',
                                }}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    top: '100%',
                                    transform: 'translate(-50%, 8px)',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 'min(220px, 70vw)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    background: 'rgba(5, 5, 5, 0.92)',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid rgba(129, 140, 248, 0.45)',
                                    boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                                }}
                                title={markerPos.label}
                            >
                                {markerPos.label}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <div>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>Distritos:</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {DISTRITOS.map((distrito) => {
                        const isOn = active === distrito.label
                        return (
                            <button
                                key={distrito.label}
                                type="button"
                                onClick={() => setActive((prev) => (prev === distrito.label ? null : distrito.label))}
                                aria-pressed={isOn}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    background: isOn ? 'rgba(99, 102, 241, 0.28)' : 'rgba(99, 102, 241, 0.1)',
                                    border: isOn ? '1px solid rgba(129, 140, 248, 0.65)' : '1px solid rgba(99, 102, 241, 0.2)',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-color)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                {distrito.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
