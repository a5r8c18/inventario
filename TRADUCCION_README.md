# Sistema de Traducción (i18n)

## Archivos de Traducción

Los archivos de traducción se encuentran en `src/assets/i18n/`:

- `es.json` - Español (idioma por defecto)
- `en.json` - Inglés

## Cómo Usar las Traducciones

### 1. En las Plantillas HTML (usando el pipe)

```html
<!-- Traducción simple -->
<h1>{{ 'APP.TITLE' | translate }}</h1>
<button>{{ 'COMMON.SAVE' | translate }}</button>

<!-- Traducción con parámetros -->
<p>{{ 'VALIDATION.MIN_VALUE' | translate: {min: 10} }}</p>
```

### 2. En los Componentes TypeScript

```typescript
import { Component } from "@angular/core";
import { TranslationService } from "./services/translation/translation.service";

@Component({
  selector: "app-example",
  template: `<h1>{{ title }}</h1>`,
})
export class ExampleComponent {
  title: string;

  constructor(private translationService: TranslationService) {
    // Obtener traducción
    this.title = this.translationService.translate("APP.TITLE");

    // O de forma instantánea
    this.title = this.translationService.instant("APP.TITLE");

    // Con parámetros
    const message = this.translationService.translate("VALIDATION.MIN_VALUE", { min: 10 });
  }
}
```

### 3. Cambiar el Idioma

```typescript
import { TranslationService } from './services/translation/translation.service';

constructor(private translationService: TranslationService) {}

switchLanguage() {
  // Cambiar a inglés
  this.translationService.setLanguage('en');

  // Cambiar a español
  this.translationService.setLanguage('es');
}

// Obtener idioma actual
getCurrentLang() {
  return this.translationService.getCurrentLanguage();
}

// Observar cambios de idioma
ngOnInit() {
  this.translationService.currentLang$.subscribe(lang => {
    console.log('Idioma cambiado a:', lang);
  });
}
```

### 4. Agregar el Pipe a un Componente Standalone

```typescript
import { Component } from "@angular/core";
import { TranslatePipe } from "./pipes/translate.pipe";

@Component({
  selector: "app-example",
  standalone: true,
  imports: [TranslatePipe], // Importar el pipe
  template: `<h1>{{ "APP.TITLE" | translate }}</h1>`,
})
export class ExampleComponent {}
```

## Ejemplo de Componente Completo

```typescript
import { Component, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { TranslatePipe } from "../../pipes/translate.pipe";
import { TranslationService } from "../../services/translation/translation.service";

@Component({
  selector: "app-example",
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div>
      <h1>{{ "APP.TITLE" | translate }}</h1>
      <button (click)="changeLanguage('es')">Español</button>
      <button (click)="changeLanguage('en')">English</button>

      <p>{{ "AUTH.EMAIL" | translate }}: {{ email }}</p>
      <p>{{ message }}</p>
    </div>
  `,
})
export class ExampleComponent implements OnInit {
  email = "user@example.com";
  message = "";

  constructor(private translationService: TranslationService) {}

  ngOnInit() {
    // Obtener traducción en el componente
    this.message = this.translationService.instant("MESSAGES.SAVE_SUCCESS");
  }

  changeLanguage(lang: string) {
    this.translationService.setLanguage(lang);
  }
}
```

## Estructura de las Traducciones

Las traducciones están organizadas por módulos:

- **APP**: Títulos generales de la aplicación
- **MENU**: Elementos del menú de navegación
- **AUTH**: Autenticación (login, registro, etc.)
- **DASHBOARD**: Panel de control
- **INVENTORY**: Inventario
- **MOVEMENTS**: Movimientos
- **PURCHASES**: Compras
- **REPORTS**: Reportes
- **SETTINGS**: Configuración
- **PROFILE**: Perfil de usuario
- **COMMON**: Términos comunes (botones, acciones, etc.)
- **VALIDATION**: Mensajes de validación
- **MESSAGES**: Mensajes de éxito, error, etc.

## Agregar Nuevas Traducciones

1. Abre `src/assets/i18n/es.json` y `en.json`
2. Agrega las nuevas claves manteniendo la estructura JSON
3. Usa la notación de punto para acceder a las traducciones

Ejemplo:

```json
{
  "NUEVO_MODULO": {
    "TITULO": "Mi Título",
    "DESCRIPCION": "Mi Descripción"
  }
}
```

Uso: `{{ 'NUEVO_MODULO.TITULO' | translate }}`

## Idioma por Defecto

El sistema carga español (es) por defecto y guarda la preferencia del usuario en `localStorage`.
