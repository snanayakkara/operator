import { ToastService } from '@/services/ToastService';

const toastService = ToastService.getInstance();

export const notifySuccess = (title: string, message?: string, duration = 3000): string => {
  return toastService.success(title, message, duration);
};

export const notifyError = (title: string, message?: string, duration = 4000): string => {
  return toastService.error(title, message, duration);
};

export const notifyWarning = (title: string, message?: string, duration = 4000): string => {
  return toastService.warning(title, message, duration);
};

export const notifyInfo = (title: string, message?: string, duration = 3000): string => {
  return toastService.info(title, message, duration);
};
