/**
 * imageCache.ts
 * Sistema de almacenamiento en caché para imágenes de Bahía Oficios.
 * 
 * Combina:
 * 1. CacheStorage API del navegador ('bahia-images-cache-v1') para persistencia entre sesiones.
 * 2. In-memory Map de Blob URLs para acceso síncrono ultra-rápido (0ms) sin revalidación de red.
 * 3. Precalentamiento inteligente de imágenes críticas y avatares.
 */

const CACHE_NAME = 'bahia-images-cache-v1';

// Memoria RAM para URLs ya resueltas durante la sesión
const memoryCache = new Map<string, string>();
// Control de promesas en curso para evitar descargas duplicadas de la misma URL
const inFlightRequests = new Map<string, Promise<string>>();

/**
 * Comprueba de forma síncrona si la imagen ya está en memoria RAM.
 * Útil para evitar parpadeos en renders subsiguientes.
 */
export function getSyncCachedUrl(src?: string): string | null {
  if (!src) return null;
  return memoryCache.get(src) || null;
}

/**
 * Obtiene la imagen de la caché persistente (CacheStorage) o la descarga y la guarda.
 * Retorna un Blob URL o la URL original en caso de restricciones de CORS.
 */
export async function getCachedImageUrl(src?: string): Promise<string> {
  if (!src) return '';
  
  // Data URLs y blob URLs no necesitan caché
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // 1. Verificar memoria rápida
  if (memoryCache.has(src)) {
    return memoryCache.get(src)!;
  }

  // 2. Si ya hay una descarga en curso de esta URL, reutilizar la misma promesa
  if (inFlightRequests.has(src)) {
    return inFlightRequests.get(src)!;
  }

  const fetchPromise = (async () => {
    try {
      // 3. Verificar si el navegador soporta CacheStorage
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(src);

        if (cachedResponse) {
          const blob = await cachedResponse.blob();
          const objectUrl = URL.createObjectURL(blob);
          memoryCache.set(src, objectUrl);
          return objectUrl;
        }

        // 4. Si no está en caché, intentar descargar con CORS
        try {
          const response = await fetch(src, {
            mode: 'cors',
            cache: 'force-cache',
          });

          if (response.ok) {
            // Guardar en CacheStorage una copia
            await cache.put(src, response.clone());
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            memoryCache.set(src, objectUrl);
            return objectUrl;
          }
        } catch {
          // Si el host no permite CORS o hubo error de red, usar la URL original nativa
          memoryCache.set(src, src);
          return src;
        }
      }

      // Si CacheStorage no está disponible
      memoryCache.set(src, src);
      return src;
    } catch {
      memoryCache.set(src, src);
      return src;
    } finally {
      inFlightRequests.delete(src);
    }
  })();

  inFlightRequests.set(src, fetchPromise);
  return fetchPromise;
}

/**
 * Precarga un conjunto de imágenes en segundo plano para que estén listas al navegar.
 */
export function preloadImages(urls: (string | undefined)[]): void {
  if (typeof window === 'undefined') return;

  const validUrls = urls.filter((u): u is string => Boolean(u && !u.startsWith('data:')));
  if (validUrls.length === 0) return;

  const runPreload = () => {
    validUrls.forEach((url) => {
      // Evitar si ya está en memoria
      if (!memoryCache.has(url)) {
        getCachedImageUrl(url).catch(() => {});
      }
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPreload, { timeout: 2000 });
  } else {
    setTimeout(runPreload, 200);
  }
}

/**
 * Devuelve estadísticas de las imágenes almacenadas en caché.
 */
export async function getImageCacheStats(): Promise<{ count: number }> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      const keys = await cache.keys();
      return { count: keys.length };
    }
  } catch {}
  return { count: memoryCache.size };
}

/**
 * Vacía la memoria y la caché de imágenes si es necesario.
 */
export async function clearImageCache(): Promise<boolean> {
  try {
    memoryCache.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    memoryCache.clear();

    if (typeof window !== 'undefined' && 'caches' in window) {
      return await caches.delete(CACHE_NAME);
    }
    return true;
  } catch {
    return false;
  }
}
