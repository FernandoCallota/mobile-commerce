import { useState, useEffect, useCallback } from 'react'
import { Tags, Plus, Pencil, Trash2, X } from 'lucide-react'
import { categoriesAPI } from '../services/categoriesAPI.js'
import { notifyInventoryUpdated } from '../utils/inventoryEvents.js'

const emptyForm = {
    slug: '',
    name: '',
    sortOrder: 0,
    bannerImage: '',
    keywords: '',
    isActive: true,
}

export default function AdminCategories() {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [modal, setModal] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [form, setForm] = useState(emptyForm)

    const load = useCallback(async () => {
        try {
            setLoading(true)
            const data = await categoriesAPI.getAll()
            setItems(Array.isArray(data) ? data : [])
            setError('')
        } catch (e) {
            setError(e.message || 'Error al cargar categorías')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const openNew = () => {
        setEditingId(null)
        setForm(emptyForm)
        setModal(true)
    }

    const openEdit = (row) => {
        setEditingId(row.id)
        setForm({
            slug: row.slug,
            name: row.name,
            sortOrder: row.sortOrder ?? 0,
            bannerImage: row.bannerImage || '',
            keywords: Array.isArray(row.keywords) ? row.keywords.join(', ') : '',
            isActive: row.isActive !== false,
        })
        setModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')
        try {
            const keywords = form.keywords
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean)
            const body = {
                slug: form.slug.trim(),
                name: form.name.trim(),
                sortOrder: Number(form.sortOrder) || 0,
                bannerImage: form.bannerImage.trim() || null,
                keywords,
                isActive: form.isActive,
            }
            if (editingId) {
                await categoriesAPI.update(editingId, body)
            } else {
                await categoriesAPI.create(body)
            }
            await load()
            notifyInventoryUpdated()
            setModal(false)
            setForm(emptyForm)
            setEditingId(null)
        } catch (err) {
            setError(err.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (row) => {
        if (!window.confirm(`¿Eliminar o desactivar la categoría «${row.name}»?`)) return
        try {
            await categoriesAPI.remove(row.id)
            await load()
            notifyInventoryUpdated()
        } catch (err) {
            alert(err.message || 'Error')
        }
    }

    if (loading && items.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                Cargando categorías…
            </div>
        )
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Tags size={28} color="var(--primary-color)" />
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Categorías</h2>
                </div>
                <button type="button" className="btn-primary" onClick={openNew}>
                    <Plus size={18} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                    Nueva categoría
                </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Las categorías predeterminadas se crean al iniciar el servidor. Puedes editar nombres, orden, imagen de
                cabecera y palabras clave para filtros.
            </p>

            {error && (
                <div className="glass glass-card" style={{ padding: '12px', marginBottom: '16px', color: 'var(--accent-color)' }}>
                    {error}
                </div>
            )}

            <div className="glass glass-card" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'left' }}>
                            <th style={{ padding: '10px 12px' }}>Orden</th>
                            <th style={{ padding: '10px 12px' }}>Slug</th>
                            <th style={{ padding: '10px 12px' }}>Nombre</th>
                            <th style={{ padding: '10px 12px' }}>Cabecera</th>
                            <th style={{ padding: '10px 12px' }}>Activa</th>
                            <th style={{ padding: '10px 12px' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((row) => (
                            <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <td style={{ padding: '10px 12px' }}>{row.sortOrder}</td>
                                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{row.slug}</td>
                                <td style={{ padding: '10px 12px' }}>{row.name}</td>
                                <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{row.bannerImage || '—'}</td>
                                <td style={{ padding: '10px 12px' }}>{row.isActive ? 'Sí' : 'No'}</td>
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                    <button
                                        type="button"
                                        onClick={() => openEdit(row)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', marginRight: 8 }}
                                        title="Editar"
                                    >
                                        <Pencil size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(row)}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}
                                        title="Eliminar / desactivar"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    onClick={() => !saving && setModal(false)}
                >
                    <form
                        className="glass glass-card"
                        onClick={(e) => e.stopPropagation()}
                        onSubmit={handleSubmit}
                        style={{ width: '100%', maxWidth: '480px', padding: '20px' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>{editingId ? 'Editar categoría' : 'Nueva categoría'}</h3>
                            <button type="button" onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                <X size={22} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <label>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Slug (URL)</span>
                                <input
                                    required
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    disabled={!!editingId}
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                    placeholder="ej. pollos"
                                />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Nombre visible</span>
                                <input
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Orden</span>
                                <input
                                    type="number"
                                    value={form.sortOrder}
                                    onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Imagen cabecera (archivo en /assets/cabeceras/)</span>
                                <input
                                    value={form.bannerImage}
                                    onChange={(e) => setForm({ ...form, bannerImage: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                    placeholder="polloos.jpg"
                                />
                            </label>
                            <label>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Palabras clave (coma)</span>
                                <input
                                    value={form.keywords}
                                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                    placeholder="pollo, pollos, aves"
                                />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                                />
                                <span>Activa</span>
                            </label>
                        </div>
                        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={saving}>
                            {saving ? 'Guardando…' : 'Guardar'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
