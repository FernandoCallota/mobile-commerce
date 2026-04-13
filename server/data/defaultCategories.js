/**
 * Categorías base del negocio (se insertan al iniciar si la tabla está vacía).
 * slug: coincide con filtros del catálogo (App.jsx).
 */
export const DEFAULT_CATEGORIES = [
    { slug: 'pollos', name: 'Pollos', sortOrder: 10, bannerImage: 'polloos.jpg', keywords: ['pollos', 'pollo'] },
    { slug: 'gallos', name: 'Gallos', sortOrder: 20, bannerImage: 'gallos.jpg', keywords: ['gallos', 'gallo'] },
    { slug: 'ponedoras', name: 'Ponedoras', sortOrder: 30, bannerImage: 'ponedoras.png', keywords: ['ponedoras', 'ponedora'] },
    { slug: 'patos', name: 'Patos', sortOrder: 40, bannerImage: 'patos.jpg', keywords: ['patos', 'pato'] },
    { slug: 'pavos', name: 'Pavos', sortOrder: 50, bannerImage: 'pavos.jpg', keywords: ['pavos', 'pavo'] },
    { slug: 'porcinos', name: 'Porcinos', sortOrder: 60, bannerImage: 'porcinoos.jpeg', keywords: ['porcinos', 'porcino', 'cerdos', 'cerdo'] },
    { slug: 'mascotas', name: 'Mascotas', sortOrder: 70, bannerImage: 'mascotas.jpg', keywords: ['mascotas', 'mascota', 'perros', 'gatos'] },
    { slug: 'medicina', name: 'Medicamentos', sortOrder: 80, bannerImage: 'medicina.jpeg', keywords: ['medicamentos', 'medicina', 'medicamento'] },
];
