import React, { createContext, useContext, useState, useCallback } from 'react';
import { CustomAlert } from '../components/CustomAlert';

type AlertType = 'info' | 'warning' | 'error' | 'success';

interface AlertOptions {
    title: string;
    message: string;
    type?: AlertType;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onClose?: () => void;
}

interface AlertContextData {
    showAlert: (options: AlertOptions) => void;
    hideAlert: () => void;
}

const AlertContext = createContext<AlertContextData>({} as AlertContextData);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState<AlertOptions & { visible: boolean }>({
        visible: false,
        title: '',
        message: '',
    });

    const showAlert = useCallback((options: AlertOptions) => {
        setAlertConfig({
            ...options,
            visible: true,
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        alertConfig.onClose?.();
    }, [alertConfig]);

    const handleConfirm = useCallback(() => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        alertConfig.onConfirm?.();
    }, [alertConfig]);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert }}>
            {children}
            <CustomAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type || 'info'}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                onConfirm={alertConfig.onConfirm ? handleConfirm : undefined}
                onClose={hideAlert}
            />
        </AlertContext.Provider>
    );
};

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};
