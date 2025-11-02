import React, { useEffect, useRef, useState } from 'react';
import { BadgeCheck, UploadCloud, Trash2, ImageOff } from 'lucide-react';
import { logger } from '@/utils/Logger';
import {
  LANYARD_CARD_TEXTURE_KEY,
  MAX_LANYARD_TEXTURE_SIZE_BYTES,
  createLanyardTexturePreference,
  parseLanyardTexturePreference,
  type LanyardTexturePreference
} from '@/config/lanyardPreferences';

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const CARD_VISIBLE_VERTICAL_RATIO = 0.755; // Approximate UV coverage used by the 3D model

export const LanyardPreferencesSection: React.FC = () => {
  const [preference, setPreference] = useState<LanyardTexturePreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [textureDimensions, setTextureDimensions] = useState<{ width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const result = await chrome.storage.local.get(LANYARD_CARD_TEXTURE_KEY);
        if (!isMounted) return;

        const pref = parseLanyardTexturePreference(result[LANYARD_CARD_TEXTURE_KEY]);
        setPreference(pref);
      } catch (error) {
        logger.error('Failed to load lanyard preferences', {
          component: 'LanyardPreferencesSection',
          error: error instanceof Error ? error.message : String(error)
        });
        if (isMounted) {
          setErrorMessage('Unable to load current lanyard artwork.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const id = window.setTimeout(() => setStatusMessage(null), 4000);
    return () => window.clearTimeout(id);
  }, [statusMessage]);

  useEffect(() => {
    if (!preference?.dataUrl) {
      setTextureDimensions(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      setTextureDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = preference.dataUrl;
  }, [preference?.dataUrl]);

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMessage('Please choose a PNG or JPEG image.');
      resetFileInput();
      return;
    }

    if (file.size > MAX_LANYARD_TEXTURE_SIZE_BYTES) {
      const sizeMb = (MAX_LANYARD_TEXTURE_SIZE_BYTES / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Image is too large. Maximum size is ${sizeMb}MB.`);
      resetFileInput();
      return;
    }

    const reader = new FileReader();

    reader.onload = async () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        setErrorMessage('Could not read the selected image.');
        resetFileInput();
        return;
      }

      setIsSaving(true);

      try {
        const preference = createLanyardTexturePreference(result, file.name);

        await chrome.storage.local.set({
          [LANYARD_CARD_TEXTURE_KEY]: preference
        });

        setPreference(preference);
        setStatusMessage('Lanyard artwork updated.');

        logger.info('Lanyard artwork updated', {
          component: 'LanyardPreferencesSection',
          fileName: file.name,
          size: file.size
        });
      } catch (error) {
        logger.error('Failed to save lanyard artwork', {
          component: 'LanyardPreferencesSection',
          error: error instanceof Error ? error.message : String(error)
        });
        setErrorMessage('Unable to save the selected image.');
      } finally {
        setIsSaving(false);
        resetFileInput();
      }
    };

    reader.onerror = () => {
      logger.error('FileReader failed while reading lanyard artwork', {
        component: 'LanyardPreferencesSection',
        fileName: file.name
      });
      setErrorMessage('Unable to read the selected file.');
      resetFileInput();
    };

    reader.readAsDataURL(file);
  };

  const handleClear = async () => {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await chrome.storage.local.remove(LANYARD_CARD_TEXTURE_KEY);
      setPreference(null);
      setStatusMessage('Reverted to default lanyard artwork.');

      logger.info('Lanyard artwork cleared', {
        component: 'LanyardPreferencesSection'
      });
    } catch (error) {
      logger.error('Failed to clear lanyard artwork', {
        component: 'LanyardPreferencesSection',
        error: error instanceof Error ? error.message : String(error)
      });
      setErrorMessage('Unable to clear the custom artwork.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-surface-secondary border-2 border-line-primary rounded-xl p-5">
      <div className="flex items-center space-x-2 mb-4">
        <BadgeCheck className="w-5 h-5 text-blue-600" />
        <div className="flex-1">
          <span className="font-medium text-ink-primary">Lanyard Branding</span>
          <p className="text-xs text-ink-secondary mt-0.5">
            Customize the idle-state ID card shown in the side panel.
          </p>
        </div>
        {isSaving && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
      </div>

      {isLoading ? (
        <div className="text-sm text-ink-tertiary">Loading current artwork…</div>
      ) : (
        <>
        <div className="grid gap-4 md:grid-cols-[220px,1fr]">
          <div className="rounded-lg border border-dashed border-line-primary bg-surface-primary aspect-[3/4] flex items-center justify-center overflow-hidden">
            {preference?.dataUrl ? (
              <img
                src={preference.dataUrl}
                alt="Custom lanyard artwork preview"
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center text-ink-tertiary text-xs space-y-2">
                <ImageOff className="w-8 h-8" />
                <span>No custom artwork selected</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {errorMessage && (
              <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                {errorMessage}
              </div>
            )}

            {statusMessage && (
              <div className="px-3 py-2 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
                {statusMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSelectClick}
                disabled={isSaving}
                className="mono-button flex items-center gap-2"
              >
                <UploadCloud className="w-4 h-4" />
                Choose Image…
              </button>
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving || (!preference && !errorMessage)}
                className="mono-button-secondary flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Restore Default
              </button>
            </div>

            <p className="text-xs text-ink-tertiary">
              Recommended 512×512 PNG with transparent background. Maximum file size {(
                MAX_LANYARD_TEXTURE_SIZE_BYTES /
                (1024 * 1024)
              ).toFixed(1)}
              MB.
            </p>

            {textureDimensions && (
              <p className="text-xs text-ink-secondary">
                Uploaded texture: {textureDimensions.width}×{textureDimensions.height} px. The 3D card shows roughly the top {Math.round(CARD_VISIBLE_VERTICAL_RATIO * 100)}% of the square image to preserve aspect ratio.
              </p>
            )}

            {preference?.fileName && (
              <div className="text-xs text-ink-secondary">
                Current file: <span className="font-medium text-ink-primary">{preference.fileName}</span>{' '}
                • Updated {new Date(preference.updatedAt).toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {preference?.dataUrl && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-ink-secondary uppercase tracking-wide">Lanyard Preview</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="aspect-[5/7] rounded-lg border border-line-primary bg-surface-primary overflow-hidden flex flex-col">
                <div
                  className="flex-1 w-full"
                  style={{
                    backgroundImage: `url(${preference.dataUrl})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'left top',
                    backgroundSize: `200% ${Math.round((1 / CARD_VISIBLE_VERTICAL_RATIO) * 100)}%`
                  }}
                />
                <div className="px-2 py-1 text-[10px] text-ink-tertiary text-center">Front</div>
              </div>
              <div className="aspect-[5/7] rounded-lg border border-line-primary bg-surface-primary overflow-hidden flex flex-col">
                <div
                  className="flex-1 w-full"
                  style={{
                    backgroundImage: `url(${preference.dataUrl})`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right top',
                    backgroundSize: `200% ${Math.round((1 / CARD_VISIBLE_VERTICAL_RATIO) * 100)}%`
                  }}
                />
                <div className="px-2 py-1 text-[10px] text-ink-tertiary text-center">Back</div>
              </div>
            </div>
            <p className="text-[10px] text-ink-tertiary">
              Tip: Keep important artwork near the upper half of each side; the front uses the left portion of the image, the back uses the right portion, and the bottom ~{Math.round((1 - CARD_VISIBLE_VERTICAL_RATIO) * 100)}% remains hidden behind the card edge.
            </p>
          </div>
        )}
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};
