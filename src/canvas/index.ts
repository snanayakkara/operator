import { ScreenshotCombiner, AnnotatedScreenshot } from '@/services/ScreenshotCombiner';
import '@/sidepanel/styles/globals.css';

const SLOT_COUNT = 4;
const shots: (AnnotatedScreenshot | null)[] = Array.from({ length: SLOT_COUNT }, () => null);
const combiner = new ScreenshotCombiner(SLOT_COUNT);

const qs = <T extends Element>(selector: string): T | null => document.querySelector(selector);

const setMessage = (text: string | null) => {
  const el = qs<HTMLDivElement>('#canvas-message');
  if (!el) return;
  if (text) {
    el.textContent = text;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
};

const renderSlotImage = (index: number) => {
  const imgWrap = qs<HTMLDivElement>(`[data-slot="${index}"] .slot-preview`);
  if (!imgWrap) return;
  imgWrap.innerHTML = '';
  const shot = shots[index];
  if (shot) {
    const img = document.createElement('img');
    img.src = shot.dataUrl;
    img.alt = `Slot ${index + 1}`;
    img.className = 'object-cover rounded-xl w-full h-full select-none';
    img.draggable = false;
    imgWrap.appendChild(img);
  } else {
    imgWrap.innerHTML = `
      <div class="text-center space-y-1">
        <div class="text-slate-900 font-semibold">Slot ${index + 1}</div>
        <div class="text-xs text-slate-500">Drop an image or click to upload</div>
      </div>
    `;
  }
};

const handleFile = (file: File, index: number) => {
  if (!file.type.startsWith('image/')) {
    setMessage('Please drop an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    const img = new Image();
    img.onload = () => {
      shots[index] = {
        id: `slot-${index}-${Date.now()}`,
        dataUrl,
        timestamp: Date.now(),
        width: img.width,
        height: img.height
      };
      renderSlotImage(index);
      setMessage(null);
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
};

const bindSlot = (index: number) => {
  const slotEl = qs<HTMLDivElement>(`[data-slot="${index}"] .slot-drop`);
  const buttonReplace = qs<HTMLButtonElement>(`[data-slot="${index}"] .slot-replace`);

  const handleFiles = (files: FileList | null) => {
    if (files && files[0]) handleFile(files[0], index);
  };

  const openFilePicker = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => handleFiles(input.files);
    input.click();
  };

  if (slotEl) {
    slotEl.addEventListener('dragover', (e) => e.preventDefault());
    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      handleFiles(e.dataTransfer?.files || null);
    });
    slotEl.addEventListener('click', openFilePicker);
  }

  if (buttonReplace) {
    buttonReplace.addEventListener('click', (e) => {
      e.stopPropagation();
      shots[index] = null;
      renderSlotImage(index);
    });
  }

  renderSlotImage(index);
};

const bindActions = () => {
  const clearBtn = qs<HTMLButtonElement>('#canvas-clear');
  const copyBtn = qs<HTMLButtonElement>('#canvas-copy');

  clearBtn?.addEventListener('click', () => {
    for (let i = 0; i < SLOT_COUNT; i++) shots[i] = null;
    for (let i = 0; i < SLOT_COUNT; i++) renderSlotImage(i);
    setMessage(null);
  });

  copyBtn?.addEventListener('click', async () => {
    if (!shots.some(Boolean)) {
      setMessage('Add at least one image before copying.');
      return;
    }
    copyBtn.disabled = true;
    try {
      combiner.clear();
      combiner.setGrid(shots);
      await combiner.copyToClipboard();
      setMessage('Combined image copied to clipboard.');
    } catch (error) {
      console.error('Combine failed', error);
      setMessage('Failed to combine or copy. Try again.');
    } finally {
      copyBtn.disabled = false;
    }
  });
};

const boot = () => {
  console.log('📸 Canvas page booting (vanilla).');
  const root = qs<HTMLDivElement>('#root');
  if (!root) {
    console.error('❌ Canvas root element not found.');
    return;
  }

  root.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 py-10 px-4">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-slate-100 p-6 md:p-8 space-y-6">
          <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div class="text-2xl font-semibold text-slate-900">Screenshot Combiner</div>
              <div class="text-sm text-slate-600">Drop up to four images, then copy the combined 2×2 grid.</div>
            </div>
            <div class="flex gap-2">
              <button id="canvas-clear" class="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300">
                <span class="w-4 h-4 inline-block">🗑️</span>
                Clear All
              </button>
              <button id="canvas-copy" class="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 shadow hover:shadow-md disabled:opacity-60">
                <span class="w-4 h-4 inline-block">📋</span>
                Copy to Clipboard
              </button>
            </div>
          </div>

          <div id="canvas-message" class="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800" style="display:none;"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 auto-rows-fr">
            ${Array.from({ length: SLOT_COUNT })
              .map(
                (_, i) => `
                  <div data-slot="${i}" class="space-y-3">
                    <div class="slot-drop border-2 border-dashed rounded-2xl min-h-[220px] w-full aspect-[4/3] flex items-center justify-center text-sm text-slate-600 bg-white shadow-sm border-slate-200 hover:border-blue-400 cursor-pointer">
                      <div class="slot-preview w-full h-full flex items-center justify-center"></div>
                    </div>
                    <div class="flex gap-2">
                      <button class="slot-replace inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:border-slate-300" type="button">
                        <span class="w-4 h-4 inline-block">↺</span>
                        Replace
                      </button>
                    </div>
                  </div>
                `
              )
              .join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  for (let i = 0; i < SLOT_COUNT; i++) {
    bindSlot(i);
  }
  bindActions();
};

boot();
