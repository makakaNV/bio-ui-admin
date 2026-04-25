import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import router from './router';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';

const CrimsonPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519'
    }
  }
});

const app = createApp(App);

app.use(PrimeVue, {
  theme: {
    preset: CrimsonPreset,
    options: {
      darkModeSelector: '.app-dark'
    }
  }
});

app.directive('tooltip', Tooltip);
app.use(router);
app.mount('#app');
