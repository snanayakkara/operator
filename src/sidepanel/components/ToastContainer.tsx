import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastService, Toast } from '@/services/ToastService';
import { IconButton } from './buttons/Button';

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
    // Fluent design with semantic color accents
    const baseStyles = "bg-white border rounded-fluent-sm p-3 shadow-fluent-flyout";
    
    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-emerald-200 bg-emerald-50/95`;
      case 'error':
        return `${baseStyles} border-red-200 bg-red-50/95`;
      case 'warning':
        return `${baseStyles} border-amber-200 bg-amber-50/95`;
      case 'info':
        return `${baseStyles} border-blue-200 bg-blue-50/95`;
      default:
        return `${baseStyles} border-gray-200 bg-gray-50/95`;
    }
  };

  return (
    <div className={`${getToastStyles()} animate-in slide-in-from-right-full duration-300`}>
      <div className="flex items-start space-x-3">
        <ToastIcon type={toast.type} />
        
        <div className="flex-1 min-w-0">
          <p className="text-gray-900 font-semibold text-sm leading-tight">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-gray-700 text-xs mt-1.5 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        <IconButton
          onClick={() => onRemove(toast.id)}
          icon={<X />}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        />
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
    <div 
      className="fixed top-4 right-4 z-[99999] space-y-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none" 
      aria-live="polite" 
      role="status"
      style={{
        // Ensure toasts don't interfere with Chrome extension UI
        maxWidth: 'min(20rem, calc(100vw - 2rem))',
        // Position relative to viewport for consistency across different extension contexts
        position: 'fixed',
        top: '1rem',
        right: '1rem'
      }}
    >
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onRemove={handleRemove}
          />
        </div>
      ))}
    </div>
  );
};
