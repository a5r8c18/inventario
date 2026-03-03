import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private currentLang = new BehaviorSubject<string>('es');
  private translations: any = {};
  private translationsLoaded = new BehaviorSubject<boolean>(false);

  currentLang$ = this.currentLang.asObservable();
  translationsLoaded$ = this.translationsLoaded.asObservable();

  constructor(private http: HttpClient) {
    // Cargar el idioma guardado del localStorage o usar español por defecto
    const savedLang = localStorage.getItem('language') || 'es';
    this.loadTranslations(savedLang);
  }

  /**
   * Cargar las traducciones del idioma especificado
   */
  loadTranslations(lang: string): void {
    this.translationsLoaded.next(false);
    this.http.get(`/i18n/${lang}.json`).subscribe({
      next: (translations) => {
        this.translations = translations;
        this.currentLang.next(lang);
        localStorage.setItem('language', lang);
        this.translationsLoaded.next(true);
      },
      error: (error) => {
        console.error(`Error loading translations for ${lang}`, error);
        // Si falla, cargar español por defecto
        if (lang !== 'es') {
          this.loadTranslations('es');
        } else {
          this.translationsLoaded.next(true);
        }
      },
    });
  }

  /**
   * Cambiar el idioma actual
   */
  setLanguage(lang: string): void {
    this.loadTranslations(lang);
  }

  /**
   * Obtener el idioma actual
   */
  getCurrentLanguage(): string {
    return this.currentLang.value;
  }

  /**
   * Obtener una traducción por clave
   * Ejemplo: translate('AUTH.LOGIN') retorna "Iniciar Sesión"
   */
  translate(key: string, params?: any): string {
    const keys = key.split('.');
    let result: any = this.translations;

    for (const k of keys) {
      if (result && result[k]) {
        result = result[k];
      } else {
        return key; // Si no se encuentra la clave, retornar la clave misma
      }
    }

    // Reemplazar parámetros si existen
    if (params && typeof result === 'string') {
      Object.keys(params).forEach((param) => {
        result = result.replace(`{{${param}}}`, params[param]);
      });
    }

    return result;
  }

  /**
   * Obtener una traducción instantánea (síncrona)
   */
  instant(key: string, params?: any): string {
    return this.translate(key, params);
  }

  /**
   * Obtener todas las traducciones
   */
  getTranslations(): any {
    return this.translations;
  }
}
