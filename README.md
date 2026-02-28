# Portal de Oficios Bahía Blanca

Este proyecto es una implementación de referencia para una plataforma de conexión entre clientes y profesionales de oficios.

## Estructura del Proyecto

- **/src/types**: Definiciones de TypeScript para el modelo de datos (Usuarios, Perfiles, Reseñas).
- **/src/components**: Componentes de UI reutilizables (ej: `ProfessionalCard`).
- **/src/services**: Lógica de negocio y consultas a Firestore. Incluye datos de prueba (MOCK) para la demostración.
- **/functions**: Código del Backend (Cloud Functions) para triggers de base de datos.
- **/firestore.rules**: Reglas de seguridad para la base de datos.

## Despliegue en Firebase

### 1. Base de Datos (Firestore)
Las reglas de seguridad se encuentran en `firestore.rules`. Debes copiarlas a la consola de Firebase o desplegarlas usando el CLI:
```bash
firebase deploy --only firestore:rules
```

### 2. Índices Compuestos
Para la consulta de profesionales ordenada por VIP y Rating, debes crear el siguiente índice en la colección `usuarios`:
- **Campos**:
  - `perfilProfesional.rubro`: Ascendente
  - `perfilProfesional.isVip`: Descendente
  - `perfilProfesional.ratingAvg`: Descendente

### 3. Cloud Functions
El código para la actualización automática de ratings está en `functions/index.js`.
Despliega las funciones con:
```bash
firebase deploy --only functions
```

## Ejecución Local
El frontend utiliza Vite. Para desarrollo local:
```bash
npm run dev
```
Nota: En esta demo, la aplicación utiliza datos simulados (`MOCK_PROFESSIONALS`) para demostrar la funcionalidad de UI y filtrado sin necesidad de credenciales reales de Firebase.
