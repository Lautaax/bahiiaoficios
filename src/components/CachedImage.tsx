import React, { useState, useEffect, useRef } from 'react';
import { getCachedImageUrl, getSyncCachedUrl } from '../utils/imageCache';

export interface CachedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
  showSkeleton?: boolean;
  containerClassName?: string;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackSrc,
  showSkeleton = true,
  containerClassName = '',
  loading = 'lazy',
  decoding = 'async',
  referrerPolicy = 'no-referrer',
  onLoad,
  onError,
  ...props
}) => {
  // Comprobación síncrona en memoria para renderizado instantáneo sin parpadeo
  const initialCached = getSyncCachedUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState<string>(initialCached || src || '');
  const [isLoaded, setIsLoaded] = useState<boolean>(Boolean(initialCached));
  const [hasError, setHasError] = useState<boolean>(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src) {
      setResolvedSrc('');
      setIsLoaded(false);
      return;
    }

    const syncUrl = getSyncCachedUrl(src);
    if (syncUrl) {
      setResolvedSrc(syncUrl);
      setIsLoaded(true);
      setHasError(false);
      return;
    }

    // Si no está en memoria, resolver desde CacheStorage
    let active = true;
    getCachedImageUrl(src)
      .then((cachedUrl) => {
        if (active && isMounted.current) {
          setResolvedSrc(cachedUrl);
          setHasError(false);
        }
      })
      .catch(() => {
        if (active && isMounted.current) {
          setResolvedSrc(src);
        }
      });

    return () => {
      active = false;
    };
  }, [src]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad(e as any);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoaded(true);
    if (fallbackSrc && resolvedSrc !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
    }
    if (onError) {
      onError(e as any);
    }
  };

  if (!resolvedSrc && !fallbackSrc) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden inline-block ${containerClassName}`}>
      {/* Skeleton / Shimmer mientras carga */}
      {showSkeleton && !isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-slate-200 dark:bg-slate-700/60 animate-pulse rounded-[inherit] z-0" 
          aria-hidden="true"
        />
      )}

      <img
        src={hasError && fallbackSrc ? fallbackSrc : resolvedSrc}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={loading}
        decoding={decoding}
        referrerPolicy={referrerPolicy}
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
    </div>
  );
};

export default CachedImage;
