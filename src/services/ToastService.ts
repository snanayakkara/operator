export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
}

export type ToastListener = (toasts: Toast[]) => void;

export class ToastService {
  private static instance: ToastService;
  private toasts: Toast[] = [];
  private listeners: Set<ToastListener> = new Set();
  private autoRemoveTimers: Map<string, number> = new Map();

  private constructor() {}

  public static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService();
    }
    return ToastService.instance;
  }

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    
    // Immediately call with current toasts
    listener([...this.toasts]);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener([...this.toasts]);
    });
  }

  public show(toast: Omit<Toast, 'id' | 'timestamp'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      timestamp: Date.now(),
      duration: toast.duration ?? (toast.type === 'error' ? 8000 : 5000)
    };

    this.toasts.unshift(newToast);
    
    // Keep only last 5 toasts
    if (this.toasts.length > 5) {
      const removed = this.toasts.splice(5);
      removed.forEach(toast => {
        const timer = this.autoRemoveTimers.get(toast.id);
        if (timer) {
          clearTimeout(timer);
          this.autoRemoveTimers.delete(toast.id);
        }
      });
    }

    this.notifyListeners();

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      const timer = window.setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
      
      this.autoRemoveTimers.set(id, timer);
    }

    return id;
  }

  public remove(id: string): void {
    const index = this.toasts.findIndex(toast => toast.id === id);
    if (index !== -1) {
      this.toasts.splice(index, 1);
      
      // Clear auto-remove timer
      const timer = this.autoRemoveTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        this.autoRemoveTimers.delete(id);
      }
      
      this.notifyListeners();
    }
  }

  public clear(): void {
    // Clear all timers
    this.autoRemoveTimers.forEach(timer => clearTimeout(timer));
    this.autoRemoveTimers.clear();
    
    this.toasts = [];
    this.notifyListeners();
  }

  // Convenience methods
  public success(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'success', title, message, duration });
  }

  public error(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'error', title, message, duration });
  }

  public warning(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'warning', title, message, duration });
  }

  public info(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'info', title, message, duration });
  }
}