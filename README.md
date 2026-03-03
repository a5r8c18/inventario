# Sistema de Gestión de Inventario — Frontend

Aplicación web construida con **Angular 19** que sirve como interfaz de usuario para el Sistema de Gestión de Inventario. Puede usarse de forma independiente (modo web, conectada a una API REST) o empaquetada como aplicación de escritorio mediante **Tauri 2**.

---

## Tecnologías

| Tecnología | Versión | Descripción |
|---|---|---|
| Angular | 19.x | Framework principal (standalone components) |
| TypeScript | 5.6 | Lenguaje base |
| TailwindCSS | 4.x | Estilos utilitarios |
| ng-icons / Lucide | 31.x | Librería de iconos |
| jsPDF + autoTable | 3.x / 5.x | Generación de PDF en cliente |
| SheetJS (xlsx) | 0.18 | Exportación a Excel |
| Chart.js + ng2-charts | 4.x | Gráficos del dashboard |
| ngx-toastr | 19.x | Notificaciones toast |
| @tauri-apps/api | 2.x | Integración con Tauri (modo desktop) |
| RxJS | 7.8 | Programación reactiva |

---

## Módulos y funcionalidades

### Autenticación
- Login / Signup / Recuperación de contraseña (forgot/reset password)
- JWT con interceptor HTTP
- Guard de licencia (redirige a `/license-expired` si la licencia no es válida)

### Dashboard
- Estadísticas en tiempo real: conteo de productos, compras, movimientos, facturas
- Gráficos de inventario y movimientos (Chart.js)
- Filtrado automático por empresa activa

### Inventario
- Listado con búsqueda, filtros y paginación
- CRUD completo de productos
- Control de stock mínimo

### Compras
- Formulario de compra con múltiples productos
- Actualización automática del inventario al registrar compra

### Movimientos
- Historial de entradas/salidas
- Filtros por fecha, tipo y producto

### Reportes
- **Vales de Recepción**: historial con vista detallada y exportación PDF/Excel
- **Vales de Entrega/Devolución**: historial con vista detallada y exportación PDF/Excel
- **Comprobante por rango de fecha** (v2.0): genera un resumen de todos los vales en un rango, con total por vale y total general — exportable a PDF y Excel

### Facturas
- Creación de facturas con múltiples líneas
- Vista de factura con logo e información de la empresa activa
- Exportación a PDF con diseño profesional

### Activos Fijos
- Registro y gestión de activos
- Cálculo de depreciación

### Gestión de Empresas (Multi-empresa)
- CRUD de empresas con logo (cargado desde el sistema de archivos)
- Selector de empresa activa en la barra superior
- Todos los datos se filtran automáticamente por empresa activa

### Configuración y Perfil
- Ajustes del sistema
- Gestión del perfil de usuario

---

## Estructura del proyecto

```
src/
├── app/
│   ├── components/          # Componentes por módulo (standalone)
│   │   ├── companies/       # Gestión de empresas
│   │   ├── dashboard/       # Dashboard con charts
│   │   ├── delivery-report/ # Vales de entrega/devolución + comprobante
│   │   ├── fixed-assets/    # Activos fijos
│   │   ├── inventory-list/  # Listado de inventario
│   │   ├── invoice-*/       # Formulario, lista y vista de facturas
│   │   ├── movement-list/   # Historial de movimientos
│   │   ├── purchase-form/   # Compras
│   │   ├── reception-report/# Vales de recepción
│   │   ├── reports/         # Hub de reportes
│   │   └── settings-form/   # Configuración
│   ├── guards/              # LicenseGuard, AuthGuard
│   ├── interceptors/        # authInterceptor (JWT)
│   ├── layout/              # MainLayoutComponent
│   ├── services/
│   │   ├── auth/            # UserService, AuthService
│   │   ├── companies/       # CompanyStateService
│   │   ├── invoices/        # InvoicesService
│   │   ├── products/        # ProductsService
│   │   ├── purchases/       # PurchasesService
│   │   ├── reports/         # ReportsService
│   │   ├── shared/          # NotificationService
│   │   └── tauri.service.ts # Capa de abstracción Tauri ↔ HTTP
│   └── app.config.ts        # Configuración global, icons, providers
└── types/
    └── backend-models.ts    # Interfaces TypeScript (Company, Invoice, etc.)
```

---

## Modo de funcionamiento

La app detecta automáticamente si está corriendo dentro de Tauri o en el navegador:

```typescript
// tauri.service.ts — detección de entorno
private isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
```

- **Modo desktop**: usa `invoke()` de `@tauri-apps/api` para llamar a comandos Rust
- **Modo web**: hace peticiones HTTP a la API REST (`inventario_back`)

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (modo web)
npm start
# → http://localhost:4200

# Build de producción (web)
npm run build
# → dist/browser/
```

Para desarrollo desktop, ver el README de `inventario_desktop`.

---

## Variables de entorno

En modo web, la URL de la API se configura en `src/environments/`:

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000'
};
```

---

## Exportación de datos

Todos los módulos con tablas ofrecen exportación:
- **PDF**: generado en el cliente con jsPDF + autoTable, incluye logo de la empresa activa
- **Excel**: generado con SheetJS, con formato y columnas ajustadas

---

## Compatibilidad

- Chrome / Edge (modo web)
- Windows 10/11 (modo desktop vía Tauri)
- Node.js 18+, Angular CLI 19+
