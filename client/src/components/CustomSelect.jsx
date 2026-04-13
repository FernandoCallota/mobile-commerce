import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Select estilizado (evita el menú nativo del SO).
 * `options`: [{ value, label }]
 */
export default function CustomSelect({
    id,
    value,
    onChange,
    options,
    placeholder = 'Seleccionar…',
    disabled = false,
    className = '',
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const onDoc = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [])

    const selectedOption = options.find((o) => String(o.value) === String(value))
    const display = selectedOption ? selectedOption.label : placeholder

    return (
        <div className={`custom-select ${className}`.trim()} ref={ref}>
            <button
                type="button"
                id={id}
                className="custom-select-trigger"
                disabled={disabled}
                aria-expanded={open}
                aria-haspopup="listbox"
                onClick={() => !disabled && setOpen((o) => !o)}
            >
                <span className={!selectedOption ? 'custom-select-placeholder' : undefined}>{display}</span>
                <ChevronDown size={20} className={`custom-select-chevron${open ? ' custom-select-chevron--open' : ''}`} aria-hidden />
            </button>
            {open && !disabled && (
                <ul className="custom-select-menu" role="listbox">
                    {options.map((o) => (
                        <li key={String(o.value)} role="none">
                            <button
                                type="button"
                                role="option"
                                className={`custom-select-option${String(value) === String(o.value) ? ' custom-select-option--active' : ''}`}
                                aria-selected={String(value) === String(o.value)}
                                onClick={() => {
                                    onChange(o.value)
                                    setOpen(false)
                                }}
                            >
                                {o.label}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
