// === INTERCEPTOR DE INITIALIZEDESKTOP ===
console.log('🕵️‍♂️ Desktop interceptor loaded');

// Interceptar TODAS las llamadas a initializeDesktop
const originalInitDesktop = window.initializeDesktop;

window.initializeDesktop = async function() {
  console.log('🕵️‍♂️ INTERCEPTED: initializeDesktop() called from:', new Error().stack);
  
  // Devolver éxito inmediato
  console.log('✅ INTERCEPTOR: Returning success without starting backend');
  return true;
};

// También interceptar si está en un objeto
Object.defineProperty(window, 'initializeDesktop', {
  get: function() {
    console.log('🕵️‍♂️ Someone is accessing initializeDesktop');
    return async function() {
      console.log('✅ INTERCEPTOR: Short-circuiting initializeDesktop');
      return true;
    };
  },
  set: function(value) {
    console.log('🕵️‍♂️ Someone is trying to set initializeDesktop to:', value);
  },
  configurable: true
});

console.log('🕵️‍♂️ Interceptor ready - all initializeDesktop calls will be captured');