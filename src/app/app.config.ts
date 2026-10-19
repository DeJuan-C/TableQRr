import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { SupabaseService } from './shared/supabase.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAppInitializer(() => {
      inject(SupabaseService);
    }),
    // withComponentInputBinding lets route params like :tableId arrive as component inputs.
    provideRouter(routes, withComponentInputBinding()),
  ],
};
