import cloudinary from '../config/cloudinary.config.js';
import dotenv from 'dotenv';

dotenv.config();

async function testCloudinary() {
    try {
        console.log('🔍 Verificando configuración de Cloudinary...\n');
        
        // Verificar que las variables de entorno estén configuradas
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        
        console.log('📋 Variables de entorno:');
        console.log(`   Cloud Name: ${cloudName ? '✅ Configurado' : '❌ Faltante'}`);
        console.log(`   API Key: ${apiKey ? '✅ Configurado' : '❌ Faltante'}`);
        console.log(`   API Secret: ${apiSecret ? '✅ Configurado' : '❌ Faltante'}\n`);
        
        if (!cloudName || !apiKey || !apiSecret) {
            console.error('❌ Error: Faltan credenciales en el archivo .env');
            console.log('\n💡 Asegúrate de tener esto en server/.env:');
            console.log('CLOUDINARY_CLOUD_NAME=dvnlcwqu7');
            console.log('CLOUDINARY_API_KEY=947584168341749');
            console.log('CLOUDINARY_API_SECRET=pckokQOj1R2q-F4O_i_TYodp_kw');
            process.exit(1);
        }
        
        // Probar conexión con Cloudinary
        console.log('🔌 Probando conexión con Cloudinary...\n');
        
        // Hacer una petición simple para verificar las credenciales
        const result = await cloudinary.api.ping();
        
        console.log('✅ ¡Conexión exitosa con Cloudinary!');
        console.log(`   Status: ${result.status}`);
        console.log(`   Cloud Name: ${cloudName}`);
        console.log(`   API Key: ${apiKey}\n`);
        
        // Probar subida de una imagen de prueba (opcional)
        console.log('📤 Probando subida de imagen de prueba...');
        
        // Crear una imagen de prueba pequeña (1x1 pixel transparente en base64)
        const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        const uploadResult = await cloudinary.uploader.upload(testImage, {
            folder: 'nutrimentos-pavio/test',
            public_id: 'test-connection',
            overwrite: true
        });
        
        console.log('✅ ¡Subida de prueba exitosa!');
        console.log(`   URL: ${uploadResult.secure_url}`);
        console.log(`   Public ID: ${uploadResult.public_id}\n`);
        
        // Limpiar: eliminar la imagen de prueba
        await cloudinary.uploader.destroy(uploadResult.public_id);
        console.log('🧹 Imagen de prueba eliminada\n');
        
        console.log('🎉 ¡Todo funciona correctamente! Cloudinary está configurado y listo para usar.');
        
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error al conectar con Cloudinary:');
        console.error(`   Mensaje: ${error.message}`);
        
        if (error.message.includes('Invalid API Key') || error.message.includes('401')) {
            console.error('\n💡 Posibles causas:');
            console.error('   1. Las credenciales en .env son incorrectas');
            console.error('   2. Hay espacios extra en las credenciales');
            console.error('   3. El archivo .env no se está cargando correctamente');
        }
        
        process.exit(1);
    }
}

testCloudinary();

