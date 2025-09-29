import { logger } from '@/utils/Logger';
import { toError } from '@/utils/errorHelpers';

export interface AnnotatedScreenshot {
  id: string;
  dataUrl: string;
  annotations?: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface CombinedScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  screenshotCount: number;
  timestamp: number;
}

export class ScreenshotCombiner {
  private screenshots: AnnotatedScreenshot[] = [];
  private gridSlots: (AnnotatedScreenshot | null)[] = [null, null, null, null];
  private maxScreenshots: number = 4;

  constructor(maxScreenshots: number = 4) {
    this.maxScreenshots = maxScreenshots;
  }

  addScreenshot(screenshot: AnnotatedScreenshot): void {
    if (this.screenshots.length >= this.maxScreenshots) {
      logger.warn(`Maximum ${this.maxScreenshots} screenshots reached. Replacing oldest.`, {
        component: 'screenshot-combiner',
        operation: 'add-screenshot',
        maxScreenshots: this.maxScreenshots
      });
      this.screenshots.shift();
    }
    this.screenshots.push(screenshot);
    logger.info(`Screenshot added. Total: ${this.screenshots.length}/${this.maxScreenshots}`, {
      component: 'screenshot-combiner',
      operation: 'add-screenshot',
      current: this.screenshots.length,
      max: this.maxScreenshots
    });
  }

  // Set explicit 2x2 grid slots: [0]=top-left, [1]=top-right, [2]=bottom-left, [3]=bottom-right
  setGrid(slots: (AnnotatedScreenshot | null)[]): void {
    const copy: (AnnotatedScreenshot | null)[] = [null, null, null, null];
    for (let i = 0; i < 4; i++) {
      copy[i] = slots[i] || null;
    }
    this.gridSlots = copy;
    // Keep legacy list in sync for counts/logging
    this.screenshots = this.gridSlots.filter((s): s is AnnotatedScreenshot => s !== null);
  }

  removeScreenshot(id: string): boolean {
    const index = this.screenshots.findIndex(s => s.id === id);
    if (index !== -1) {
      this.screenshots.splice(index, 1);
      logger.info(`Screenshot removed. Remaining: ${this.screenshots.length}`, {
        component: 'screenshot-combiner',
        operation: 'remove-screenshot',
        remaining: this.screenshots.length
      });
      return true;
    }
    return false;
  }

  getScreenshots(): AnnotatedScreenshot[] {
    return [...this.screenshots];
  }

  getScreenshotCount(): number {
    return this.screenshots.length;
  }

  canAddMore(): boolean {
    return this.screenshots.length < this.maxScreenshots;
  }

  clear(): void {
    this.screenshots = [];
    this.gridSlots = [null, null, null, null];
    logger.info('All screenshots cleared', {
      component: 'screenshot-combiner',
      operation: 'clear'
    });
  }

  async combineScreenshots(): Promise<CombinedScreenshotResult> {
    if (this.screenshots.length === 0) {
      throw new Error('No screenshots to combine');
    }

    logger.info(`Combining ${this.screenshots.length} screenshots into 2x2 grid (10x10 cm)`, {
      component: 'screenshot-combiner',
      operation: 'combine-start',
      count: this.screenshots.length
    });

    try {
      const combinedDataUrl = await this.createCombinedCanvas();
      const result: CombinedScreenshotResult = {
        dataUrl: combinedDataUrl,
        width: 0,
        height: 0,
        screenshotCount: this.screenshots.length,
        timestamp: Date.now()
      };

      logger.info(`Successfully combined ${this.screenshots.length} screenshots`, {
        component: 'screenshot-combiner',
        operation: 'combine-success',
        count: this.screenshots.length
      });
      return result;
    } catch (error) {
      const err = toError(error);
      logger.error('Failed to combine screenshots', err, {
        component: 'screenshot-combiner',
        operation: 'combine-error'
      });
      throw new Error(`Screenshot combination failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private drawCombinedCanvas(): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Define physical size: 10x10 cm canvas, 5x5 cm cells
        const CM_TO_PX = 96 / 2.54; // ~37.795 px/cm
        const totalSizePx = Math.round(10 * CM_TO_PX);
        const cellSizePx = Math.round(5 * CM_TO_PX);
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

        // Set canvas pixel size for crisp output, draw in CSS px units
        canvas.width = totalSizePx * dpr;
        canvas.height = totalSizePx * dpr;
        ctx.scale(dpr, dpr);

        logger.debug(`Canvas dimensions: ${totalSizePx}x${totalSizePx} (CSS px), DPR=${dpr}`, {
          component: 'screenshot-combiner',
          operation: 'canvas-setup',
          width: totalSizePx,
          height: totalSizePx,
          dpr
        });

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, totalSizePx, totalSizePx);

        // Helper to draw an image into a square cell with center-crop (object-fit: cover)
        const drawIntoCell = (img: HTMLImageElement, cellX: number, cellY: number, cellSize: number) => {
          ctx.save();
          ctx.beginPath();
          ctx.rect(cellX, cellY, cellSize, cellSize);
          ctx.clip();
          const scale = Math.max(cellSize / img.width, cellSize / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          const dx = cellX + (cellSize - drawW) / 2;
          const dy = cellY + (cellSize - drawH) / 2;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, dx, dy, drawW, drawH);
          ctx.restore();
        };

        // Load each non-null slot image
        const slots = this.gridSlots;
        const imgs: (HTMLImageElement | null)[] = [null, null, null, null];
        let toLoad = slots.filter(Boolean).length;
        if (toLoad === 0) {
          // No images; still return a blank 10x10 canvas
          resolve(canvas);
          return;
        }

        const tryFinish = () => {
          toLoad--;
          if (toLoad === 0) {
            // Draw in 2x2 layout
            const positions: { x: number; y: number }[] = [
              { x: 0, y: 0 },
              { x: cellSizePx, y: 0 },
              { x: 0, y: cellSizePx },
              { x: cellSizePx, y: cellSizePx },
            ];
            for (let i = 0; i < 4; i++) {
              const img = imgs[i];
              if (!img) continue;
              const pos = positions[i];
              drawIntoCell(img, pos.x, pos.y, cellSizePx);
              logger.debug(`Drew slot ${i + 1} at (${pos.x}, ${pos.y}), cell ${cellSizePx}x${cellSizePx}`, {
                component: 'screenshot-combiner',
                operation: 'draw-slot',
                slot: i + 1,
                x: pos.x,
                y: pos.y,
                cellSize: cellSizePx
              });
            }
            logger.info('Canvas combination completed', {
              component: 'screenshot-combiner',
              operation: 'canvas-complete'
            });
            resolve(canvas);
          }
        };

        slots.forEach((slot, i) => {
          if (!slot) return;
          const img = new Image();
          img.onload = () => {
            imgs[i] = img;
            logger.debug(`Loaded slot ${i + 1} image - ${img.width}x${img.height}`, {
              component: 'screenshot-combiner',
              operation: 'load-image',
              slot: i + 1,
              width: img.width,
              height: img.height
            });
            tryFinish();
          };
          img.onerror = (error) => {
            const err = toError(error);
            logger.error(`Failed to load slot ${i + 1} image`, err, {
              component: 'screenshot-combiner',
              operation: 'load-image',
              slot: i + 1,
              error: error instanceof Error ? error.message : String(error)
            });
            // Skip this slot but continue
            imgs[i] = null;
            tryFinish();
          };
          img.src = slot.dataUrl;
        });

      } catch (error) {
        const err = toError(error);
        logger.error('Error setting up canvas combination', err, {
          component: 'screenshot-combiner',
          operation: 'canvas-setup'
        });
        reject(error);
      }
    });
  }

  private createCombinedCanvas(): Promise<string> {
    return this.drawCombinedCanvas().then((canvas) => canvas.toDataURL('image/png'));
  }

  async copyToClipboard(): Promise<void> {
    if (this.screenshots.length === 0) {
      throw new Error('No screenshots to copy');
    }

    try {
      // Render to canvas and copy as image/png without using fetch on data URLs (avoids CSP)
      const canvas = await this.drawCombinedCanvas();
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      });
      const clipboardItem = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([clipboardItem]);
      logger.info('Combined screenshot copied to clipboard', {
        component: 'screenshot-combiner',
        operation: 'copy-clipboard'
      });
    } catch (error) {
      const err = toError(error);
      logger.error('Failed to copy to clipboard', err, {
        component: 'screenshot-combiner',
        operation: 'copy-clipboard'
      });
      throw new Error(`Clipboard copy failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
