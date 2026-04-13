import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * Flechas + texto. Oculto si una sola página.
 */
export default function PaginationBar({ page, totalPages, onPageChange, className = '' }) {
    if (totalPages <= 1) return null

    const go = (next) => {
        const p = Math.min(Math.max(1, next), totalPages)
        if (p !== page) onPageChange(p)
    }

    return (
        <div className={`pagination-bar ${className}`.trim()} role="navigation" aria-label="Paginación">
            <button
                type="button"
                className="pagination-bar-btn"
                onClick={() => go(page - 1)}
                disabled={page <= 1}
                aria-label="Página anterior"
            >
                <ChevronLeft size={22} aria-hidden />
            </button>
            <span className="pagination-bar-info">
                Página {page} de {totalPages}
            </span>
            <button
                type="button"
                className="pagination-bar-btn"
                onClick={() => go(page + 1)}
                disabled={page >= totalPages}
                aria-label="Página siguiente"
            >
                <ChevronRight size={22} aria-hidden />
            </button>
        </div>
    )
}
