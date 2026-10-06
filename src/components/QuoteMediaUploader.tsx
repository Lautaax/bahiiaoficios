import React, { useState, useRef } from 'react';
import { 
  Camera, Video, Trash2, Sparkles, CheckCircle2, 
  AlertCircle, Clock, Play, Pause, FileCheck, Layers, 
  RefreshCw, Info
} from 'lucide-react';
import { 
  CompressedMediaItem, 
  compressImageFile, 
  compressVideoFile, 
  formatBytes,
  getDaysRemaining
} from '../utils/mediaCompressor';

interface QuoteMediaUploaderProps {
  mediaList: CompressedMediaItem[];
  onChange: (updatedList: CompressedMediaItem[]) => void;
  maxFiles?: number;
}

export const QuoteMediaUploader: React.FC<QuoteMediaUploaderProps> = ({
  mediaList,
  onChange,
  maxFiles = 5
}) => {
  const [compressing, setCompressing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    if (mediaList.length + files.length > maxFiles) {
      setErrorMsg(`Podés adjuntar como máximo ${maxFiles} archivos por solicitud.`);
      return;
    }

    setCompressing(true);
    const newItems: CompressedMediaItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setCurrentFileName(file.name);
        setCurrentProgress(10);

        if (file.type.startsWith('image/')) {
          const item = await compressImageFile(file, (p) => setCurrentProgress(Math.round(p)));
          newItems.push(item);
        } else if (file.type.startsWith('video/')) {
          if (file.size > 80 * 1024 * 1024) {
            setErrorMsg(`El video ${file.name} es muy pesado. Recomendamos grabar un video corto de menos de 45 segundos.`);
            continue;
          }
          const item = await compressVideoFile(file, 45, (p) => setCurrentProgress(p));
          newItems.push(item);
        } else {
          setErrorMsg(`El formato de ${file.name} no es compatible. Usá fotos (JPG, PNG, WebP) o videos cortos (MP4, WebM, MOV).`);
        }
      }

      if (newItems.length > 0) {
        onChange([...mediaList, ...newItems]);
      }
    } catch (err: any) {
      console.error("Error compressing media:", err);
      setErrorMsg("Ocurrió un error al procesar y comprimir los archivos. Por favor intentá nuevamente.");
    } finally {
      setCompressing(false);
      setCurrentProgress(0);
      setCurrentFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (id: string) => {
    onChange(mediaList.filter(item => item.id !== id));
  };

  const totalSavedBytes = mediaList.reduce((acc, curr) => acc + Math.max(0, curr.originalSize - curr.compressedSize), 0);

  return (
    <div className="space-y-4">
      {/* Header and Instructions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Fotos o Videos Cortos de la Falla / Obra (Opcional)
          </label>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Comprimidos automáticamente sin perder nitidez. Los videos se conservan <strong>1 mes</strong> para optimizar almacenamiento.
          </p>
        </div>
        
        {mediaList.length > 0 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 self-start sm:self-auto">
            <Sparkles size={13} />
            <span>Ahorro total: {formatBytes(totalSavedBytes)}</span>
          </div>
        )}
      </div>

      {/* Upload Dropzone / Button */}
      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-4 sm:p-5 transition-colors bg-gray-50/50 dark:bg-gray-800/40 text-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={compressing || mediaList.length >= maxFiles}
        />

        {compressing ? (
          <div className="py-4 flex flex-col items-center justify-center space-y-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <RefreshCw size={28} className="text-indigo-600 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-800 dark:text-white">
                Comprimiendo y optimizando formato...
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs">
                {currentFileName} ({currentProgress}%)
              </p>
            </div>
            <div className="w-48 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
            <div className="flex items-center gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400">
                <Camera size={20} />
              </div>
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <Video size={20} />
              </div>
            </div>

            <div className="text-center sm:text-left">
              <p className="text-xs font-bold text-gray-800 dark:text-white">
                Adjuntar fotos o clip corto de video
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Hasta {maxFiles} archivos • Formatos WebP/MP4 optimizados
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaList.length >= maxFiles}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              Seleccionar Archivos
            </button>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Media Thumbnails and Compression Overview */}
      {mediaList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {mediaList.map((item) => {
            const daysLeft = getDaysRemaining(item.expiresAt);
            const isPlaying = playingVideoId === item.id;

            return (
              <div 
                key={item.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-300 transition-all flex flex-col"
              >
                {/* Media Preview Box */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                  {item.type === 'foto' ? (
                    <img 
                      src={item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {isPlaying ? (
                        <video 
                          src={item.url} 
                          controls 
                          autoPlay 
                          className="w-full h-full object-contain"
                          onEnded={() => setPlayingVideoId(null)}
                        />
                      ) : (
                        <>
                          <img 
                            src={item.posterUrl || item.url} 
                            alt="Video thumbnail" 
                            className="w-full h-full object-cover opacity-80"
                          />
                          <button
                            type="button"
                            onClick={() => setPlayingVideoId(item.id)}
                            className="absolute p-3 rounded-full bg-indigo-600/90 text-white hover:bg-indigo-500 transition-transform hover:scale-110 shadow-lg cursor-pointer"
                            aria-label="Reproducir video"
                          >
                            <Play size={18} fill="currentColor" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Format & Type Tag */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-bold text-white uppercase tracking-wider">
                      {item.type === 'foto' ? 'Foto WebP' : 'Video WebM'}
                    </span>
                    {item.duration && (
                      <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[10px] font-medium text-slate-200">
                        {item.duration}s
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                    title="Eliminar archivo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Details Footer */}
                <div className="p-3 text-xs space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100 truncate text-[11px]" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      <span>{formatBytes(item.compressedSize)}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        -{item.savingPercent}% datos
                      </span>
                    </div>
                  </div>

                  {/* Expiration Tag */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                      <Clock size={11} />
                      <span>Expira en {daysLeft} días</span>
                    </div>
                    <span className="text-slate-400 text-[9px]">Auto-borrado</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-2 text-[11px] text-blue-900 dark:text-blue-300">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <p className="leading-relaxed">
          <strong>Optimización Bahiense:</strong> Los archivos se procesan en tu navegador para que no gastes datos de tu plan móvil. Los videos cortos duran 1 mes desde su carga para mantener la plataforma rápida y liviana para todos los vecinos.
        </p>
      </div>
    </div>
  );
};
