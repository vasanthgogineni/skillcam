// Polyfill for process variable (required by some libraries in browser)
if (typeof process === 'undefined') {
  const processPolyfill = {
    env: {} as Record<string, string>,
    browser: true,
    version: '',
    versions: {} as Record<string, string>,
    nextTick: (fn: Function) => setTimeout(fn, 0),
  };
  
  // Set on global scope (works in both browser and Node-like environments)
  if (typeof window !== 'undefined') {
    (window as any).process = processPolyfill;
  }
  if (typeof global !== 'undefined') {
    (global as any).process = processPolyfill;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).process = processPolyfill;
  }
  
  // Also try to define it directly if possible
  try {
    (globalThis as any).process = processPolyfill;
  } catch (e) {
    // Ignore if we can't set it
  }
}

