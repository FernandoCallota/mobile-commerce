/** Disparar tras cambios de stock (kardex, productos, etc.) para refrescar alertas en App. */
export const INVENTORY_UPDATED_EVENT = 'inventoryUpdated'

export function notifyInventoryUpdated() {
    window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT))
}
