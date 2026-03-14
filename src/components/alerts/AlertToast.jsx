import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Info, XCircle, Zap } from 'lucide-react';

// Toast customizados com ícones e animações
export const showSuccessToast = (message, description) => {
  toast.success(message, {
    description,
    icon: <CheckCircle2 className="w-5 h-5" />,
    duration: 4000,
  });
};

export const showErrorToast = (message, description) => {
  toast.error(message, {
    description,
    icon: <XCircle className="w-5 h-5" />,
    duration: 5000,
  });
};

export const showWarningToast = (message, description) => {
  toast.warning(message, {
    description,
    icon: <AlertTriangle className="w-5 h-5" />,
    duration: 4500,
  });
};

export const showInfoToast = (message, description) => {
  toast.info(message, {
    description,
    icon: <Info className="w-5 h-5" />,
    duration: 4000,
  });
};

// Toast de ação bem-sucedida com confetti
export const showActionSuccessToast = (message, description) => {
  toast.success(message, {
    description,
    icon: <Zap className="w-5 h-5" />,
    duration: 3000,
    className: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
  });
};

// Toast de loading
export const showLoadingToast = (message) => {
  return toast.loading(message);
};

// Atualizar toast de loading
export const updateToast = (toastId, message, type = 'success') => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <XCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
  };

  toast[type](message, {
    id: toastId,
    icon: icons[type],
  });
};

// Toast com ação
export const showToastWithAction = (message, description, actionLabel, actionCallback) => {
  toast(message, {
    description,
    action: {
      label: actionLabel,
      onClick: actionCallback,
    },
    duration: 6000,
  });
};

// Toast de progresso personalizado
export const showProgressToast = (message, progress) => {
  return toast.custom((t) => (
    <div className="w-full bg-white border border-slate-200 rounded-lg shadow-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <p className="font-medium text-slate-900">{message}</p>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1 text-right">{progress}%</p>
    </div>
  ));
};