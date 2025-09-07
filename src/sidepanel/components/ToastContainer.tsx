import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastService, Toast } from '@/services/ToastService';

const ToastIcon: React.FC<{ type: Toast['type'] }> = ({ type }) => {
  const iconProps = { className: "w-4 h-4 flex-shrink-0" };
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="w-4 h-4 text-emerald-600 flex-shrink-0" />;
    case 'error':
      return <AlertCircle {...iconProps} className="w-4 h-4 text-red-600 flex-shrink-0" />;
    case 'warning':
      return <AlertTriangle {...iconProps} className="w-4 h-4 text-amber-600 flex-shrink-0" />;
    case 'info':
      return <Info {...iconProps} className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    default:
      return <Info {...iconProps} />;
  }
};

const ToastItem: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ 
  toast, 
  onRemove 
}) => {
  const getToastStyles = () => {
    const baseStyles = "glass border rounded-lg p-3 shadow-lg backdrop-blur-sm";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} bg-emerald-50/90 border-emerald-200`;
      case 'error':
        return `${baseStyles} bg-red-50/90 border-red-200`;
      case 'warning':
        return `${baseStyles} bg-amber-50/90 border-amber-200`;
      case 'info':
        return `${baseStyles} bg-blue-50/90 border-blue-200`;
      default:
        return `${baseStyles} bg-gray-50/90 border-gray-200`;
    }
  };

  return (
    <div className={`${getToastStyles()} animate-in slide-in-from-right-full duration-300`}>
      <div className="flex items-start space-x-3">
        <ToastIcon type={toast.type} />
        
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-medium text-sm">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-gray-600 text-xs mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>
        
        <button
          onClick={() => onRemove(toast.id)}
          className="glass-button p-1 rounded hover:bg-white/20 transition-colors"
          title="Dismiss"
        >
          <X className="w-3 h-3 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  useEffect(() => {
    const toastService = ToastService.getInstance();
    const unsubscribe = toastService.subscribe(setToasts);
    
    return unsubscribe;
  }, []);

  const handleRemove = (id: string) => {
    ToastService.getInstance().remove(id);
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-[99999] space-y-2 w-80 max-w-full" aria-live="polite" role="status">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
};
