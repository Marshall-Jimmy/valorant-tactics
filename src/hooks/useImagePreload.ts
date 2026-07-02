import { useEffect } from 'react';

/**
 * Preloads an image by creating an Image element and setting its src.
 * Useful for preloading map SVGs before they're displayed.
 */
export function useImagePreload(src: string | null | undefined) {
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, [src]);
}
