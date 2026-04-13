import sequelize from '../config/db.config.js';
import User from './User.js';
import Product from './Product.js';
import Order from './Order.js';
import OrderItem from './OrderItem.js';
import OrderStatusHistory from './OrderStatusHistory.js';
import RefreshToken from './RefreshToken.js';
import Kardex from './Kardex.js';
import ContactTicket from './ContactTicket.js';

// Establecer relaciones
RefreshToken.belongsTo(User, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Relaciones de Kardex
Kardex.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Kardex.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Product.hasMany(Kardex, { foreignKey: 'productId', as: 'kardex' });
User.hasMany(Kardex, { foreignKey: 'userId', as: 'kardex' });

ContactTicket.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ContactTicket, { foreignKey: 'userId', as: 'contactTickets' });
ContactTicket.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(ContactTicket, { foreignKey: 'orderId', as: 'contactTickets' });

/** Columnas nuevas de pedidos / pago (BD existentes sin alter automático) */
async function migrateOrdersColumns(sequelize) {
    const run = async (sql, label) => {
        try {
            await sequelize.query(sql);
        } catch (e) {
            console.warn(`migrateOrders [${label}]: ${e.message}`);
        }
    };
    await run(
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10);`,
        'payment_method'
    );
    await run(`UPDATE orders SET payment_method = 'cash' WHERE payment_method IS NULL;`, 'payment_method_fill');
    await run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;`, 'payment_proof_url');
    await run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_notes TEXT;`, 'customer_notes');
    await run(
        `UPDATE orders SET status = 'delivered' WHERE status::text = 'completed';`,
        'status_completed'
    );
    await run(
        `ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(32) USING status::text;`,
        'status_varchar'
    );
    await run(
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address VARCHAR(500);`,
        'shipping_address_add'
    );
    await run(
        `ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;`,
        'shipping_null'
    );
    await run(
        `ALTER TABLE orders ALTER COLUMN shipping_address TYPE VARCHAR(500);`,
        'shipping_len'
    );
    /* Tablas antiguas: Sequelize creó "shippingAddress" (camelCase); el modelo usa shipping_address.
       El INSERT solo llena shipping_address → NOT NULL en shippingAddress fallaba. */
    await run(
        `
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'orders' AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname = 'shippingAddress'
  ) THEN
    UPDATE orders SET shipping_address = COALESCE(shipping_address, "shippingAddress"::varchar);
    ALTER TABLE orders DROP COLUMN "shippingAddress";
  END IF;
END $$;
`,
        'merge_legacy_shippingAddress'
    );
    await run(
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS enviado_at TIMESTAMP WITH TIME ZONE NULL;`,
        'enviado_at'
    );
    await run(
        `ALTER TABLE orders ADD COLUMN IF NOT EXISTS entregado_at TIMESTAMP WITH TIME ZONE NULL;`,
        'entregado_at'
    );
    await run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone VARCHAR(48);`, 'delivery_zone');
    await run(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee DECIMAL(10,2) DEFAULT 0;`, 'shipping_fee');
    await run(`UPDATE orders SET shipping_fee = 0 WHERE shipping_fee IS NULL;`, 'shipping_fee_fill');
    await run(
        `UPDATE orders SET status = 'solicitado' WHERE status IN ('pending', 'payment_review');`,
        'status_legacy_solicitado'
    );
    await run(`UPDATE orders SET status = 'preparado' WHERE status = 'processing';`, 'status_legacy_preparado');
    await run(`UPDATE orders SET status = 'enviado' WHERE status = 'dispatched';`, 'status_legacy_enviado');
    await run(
        `UPDATE orders SET status = 'entregado' WHERE status IN ('delivered', 'completed');`,
        'status_legacy_entregado'
    );
    await run(
        `UPDATE orders SET enviado_at = COALESCE("updatedAt", "createdAt") WHERE status = 'enviado' AND enviado_at IS NULL;`,
        'enviado_at_backfill'
    );
    await run(
        `UPDATE orders SET entregado_at = COALESCE("updatedAt", "createdAt") WHERE status = 'entregado' AND entregado_at IS NULL;`,
        'entregado_at_backfill'
    );
}

// Sincronizar modelos con la base de datos
const syncModels = async (force = false) => {
    try {
        await sequelize.sync({ force });
        await migrateOrdersColumns(sequelize);
        console.log('✅ Modelos sincronizados con la base de datos');
    } catch (error) {
        console.error('❌ Error al sincronizar modelos:', error);
    }
};

export {
    User,
    Product,
    Order,
    OrderItem,
    OrderStatusHistory,
    RefreshToken,
    Kardex,
    ContactTicket,
    syncModels
};

