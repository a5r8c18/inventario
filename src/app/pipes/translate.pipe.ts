import {
  Pipe,
  PipeTransform,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { TranslationService } from '../services/translation/translation.service';
import { Subscription } from 'rxjs';

@Pipe({
  name: 'translate',
  standalone: true,
  pure: false, // Hace que el pipe se actualice cuando cambia el idioma
})
export class TranslatePipe implements PipeTransform, OnDestroy {
  private subscription: Subscription;
  private lastKey: string = '';
  private lastValue: string = '';

  constructor(
    private translationService: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
    // Suscribirse a cambios en las traducciones
    this.subscription = this.translationService.translationsLoaded$.subscribe(
      () => {
        if (this.lastKey) {
          this.lastValue = this.translationService.translate(this.lastKey);
          this.cdr.markForCheck();
        }
      }
    );
  }

  transform(key: string, params?: any): string {
    if (!key) return '';

    this.lastKey = key;
    this.lastValue = this.translationService.translate(key, params);
    return this.lastValue;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
