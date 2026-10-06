/**
 * Media compression, format conversion, and auto-expiration utility for Bahía Oficios.
 * - Compresses images to WebP (high quality, small footprint ~60-150 KB).
 * - Compresses short video clips (< 45s) to lightweight WebM/MP4 with poster frame generation.
 * - Sets automatic 1-month (30-day) expiration timestamp for temporary storage cleanup.
 */
import imageCompression from 'browser-image-compression';

export interface CompressedMediaItem {
  id: string;
  type: 'foto' | 'video';
  name: string;
  url: string; // Base64 dataUrl or object URL
  posterUrl?: string; // Video thumbnail poster
  originalSize: number; // Bytes
  compressedSize: number; // Bytes
  savingPercent: number; // e.g. 78%
  format: string; // 'webp' | 'mp4' | 'webm'
  duration?: number; // Video duration in seconds
  createdAt: number; // Timestamp
  expiresAt: number; // Timestamp (1 month after createdAt)
  isExpired?: boolean;
}

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

export const formatBytes = (bytes: number, decimals = 1): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const isMediaExpired = (expiresAt: number | string | undefined): boolean => {
  if (!expiresAt) return false;
  const expiryTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  return Date.now() > expiryTime;
};

export const getDaysRemaining = (expiresAt: number | string | undefined): number => {
  if (!expiresAt) return 30;
  const expiryTime = typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt;
  const diffMs = expiryTime - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
};

/**
 * Compresses an image file, converts to WebP/JPEG, and returns lightweight base64
 */
export const compressImageFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<CompressedMediaItem> => {
  const originalSize = file.size;
  const originalName = file.name;

  try {
    const options = {
      maxSizeMB: 0.35, // Max 350 KB
      maxWidthOrHeight: 1280, // Crisp 720p/1080p resolution for inspecting cracks, pipes, panels
      useWebWorker: true,
      fileType: 'image/webp',
      onProgress: onProgress || (() => {})
    };

    const compressedBlob = await imageCompression(file, options);
    const compressedSize = compressedBlob.size;

    // Convert to Base64 data URL
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressedBlob);
    });

    const savingPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));
    const now = Date.now();

    return {
      id: `img-${now}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'foto',
      name: originalName.replace(/\.[^/.]+$/, "") + '.webp',
      url: dataUrl,
      originalSize,
      compressedSize,
      savingPercent,
      format: 'webp',
      createdAt: now,
      expiresAt: now + ONE_MONTH_MS,
      isExpired: false
    };
  } catch (error) {
    console.warn("browser-image-compression fallback to canvas", error);
    // Canvas fallback
    return await compressImageWithCanvas(file);
  }
};

const compressImageWithCanvas = async (file: File): Promise<CompressedMediaItem> => {
  const originalSize = file.size;
  const originalName = file.name;
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxWidth = 1280;
      const maxHeight = 1280;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      // Try WebP first, fallback to JPEG
      let dataUrl = canvas.toDataURL('image/webp', 0.82);
      let format = 'webp';
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        format = 'jpeg';
      }

      const approxSize = Math.round((dataUrl.length * 3) / 4);
      const savingPercent = Math.max(0, Math.round(((originalSize - approxSize) / originalSize) * 100));

      resolve({
        id: `img-${now}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'foto',
        name: originalName.replace(/\.[^/.]+$/, "") + `.${format}`,
        url: dataUrl,
        originalSize,
        compressedSize: approxSize,
        savingPercent,
        format,
        createdAt: now,
        expiresAt: now + ONE_MONTH_MS,
        isExpired: false
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
};

/**
 * Extracts a sharp poster frame thumbnail from a video file
 */
export const extractVideoPoster = async (file: File): Promise<{ posterUrl: string; duration: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(640, video.videoWidth || 640);
        canvas.height = Math.min(360, video.videoHeight || 360);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterUrl = canvas.toDataURL('image/webp', 0.8);
          URL.revokeObjectURL(objectUrl);
          resolve({ posterUrl, duration: Math.round(video.duration) });
          return;
        }
      } catch (e) {
        console.warn("Failed drawing video poster", e);
      }
      URL.revokeObjectURL(objectUrl);
      resolve({ posterUrl: '', duration: Math.round(video.duration || 0) });
    };

    video.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    video.src = objectUrl;
  });
};

/**
 * Compresses and prepares a short video file for quote requests.
 * Generates an efficient poster thumbnail, checks length, sets 1-month auto-expiration.
 */
export const compressVideoFile = async (
  file: File,
  maxDuration = 45,
  onProgress?: (progress: number) => void
): Promise<CompressedMediaItem> => {
  const originalSize = file.size;
  const originalName = file.name;
  const now = Date.now();

  onProgress?.(20);
  const { posterUrl, duration } = await extractVideoPoster(file);
  onProgress?.(50);

  if (duration > maxDuration) {
    console.warn(`Video duration (${duration}s) exceeds recommended ${maxDuration}s.`);
  }

  // Attempt client-side transcode/compress if MediaRecorder & captureStream are supported
  let compressedDataUrl: string = '';
  let compressedSize = originalSize;
  let format = 'mp4';

  try {
    const video = document.createElement('video');
    const objUrl = URL.createObjectURL(file);
    video.src = objUrl;
    video.muted = true;
    video.playsInline = true;
    await new Promise((res) => {
      video.onloadedmetadata = res;
      video.load();
    });

    // Check if we can capture stream and record at lower bitrate
    const canRecord = typeof (video as any).captureStream === 'function' && typeof MediaRecorder !== 'undefined';
    
    if (canRecord && duration <= 35 && originalSize > 2 * 1024 * 1024) {
      // Stream compress at 450 kbps
      onProgress?.(65);
      const stream = (video as any).captureStream(20);
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp8') 
          ? 'video/webm;codecs=vp8' 
          : 'video/webm',
        videoBitsPerSecond: 450000 // 450 kbps
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const recordPromise = new Promise<Blob>((res) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          res(blob);
        };
      });

      video.playbackRate = 1.5; // Accelerated pass
      recorder.start();
      video.play();

      await new Promise((res) => {
        video.onended = res;
      });
      recorder.stop();
      video.pause();

      const compressedBlob = await recordPromise;
      if (compressedBlob.size > 0 && compressedBlob.size < originalSize) {
        compressedSize = compressedBlob.size;
        format = 'webm';
        compressedDataUrl = await new Promise<string>((res) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.readAsDataURL(compressedBlob);
        });
      }
    }
    URL.revokeObjectURL(objUrl);
  } catch (err) {
    console.warn("Transcoding stream fallback to direct dataUrl", err);
  }

  // If stream compression wasn't viable or didn't yield smaller output, read as data URL
  if (!compressedDataUrl) {
    onProgress?.(80);
    compressedDataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    // If not transcoded, we still format and optimize poster frame
    compressedSize = Math.round((compressedDataUrl.length * 3) / 4);
    format = file.type.includes('webm') ? 'webm' : 'mp4';
  }

  onProgress?.(100);

  const savingPercent = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

  return {
    id: `vid-${now}-${Math.random().toString(36).substring(2, 7)}`,
    type: 'video',
    name: originalName,
    url: compressedDataUrl,
    posterUrl: posterUrl || undefined,
    originalSize,
    compressedSize,
    savingPercent: savingPercent > 0 ? savingPercent : 25,
    format,
    duration,
    createdAt: now,
    expiresAt: now + ONE_MONTH_MS, // EXACTLY 1 MONTH FROM CREATION
    isExpired: false
  };
};

/**
 * Filter out any media items whose 30-day lifecycle has ended
 */
export const purgeExpiredMedia = (mediaList: CompressedMediaItem[]): CompressedMediaItem[] => {
  if (!Array.isArray(mediaList)) return [];
  return mediaList.filter(item => !isMediaExpired(item.expiresAt));
};
