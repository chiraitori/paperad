import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';

export interface DialogButton {
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

export interface DialogConfig {
    title: string;
    message: string;
    buttons: DialogButton[];
}

export interface UseDialogReturn {
    dialogVisible: boolean;
    dialogConfig: DialogConfig;
    showDialog: (title: string, message: string, buttons?: DialogButton[]) => void;
    hideDialog: () => void;
}

/**
 * Custom hook for showing platform-adaptive dialogs
 * - iOS: Shows native Alert
 * - Android: Returns state to render AppDialog component
 */
export const useDialog = (): UseDialogReturn => {
    const [dialogVisible, setDialogVisible] = useState(false);
    const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
        title: '',
        message: '',
        buttons: [],
    });

    const showDialog = useCallback((
        title: string,
        message: string,
        buttons: DialogButton[] = [{ text: 'OK' }]
    ) => {
        if (Platform.OS === 'ios') {
            Alert.alert(
                title,
                message,
                buttons.map(btn => ({
                    text: btn.text,
                    onPress: btn.onPress,
                    style: btn.style,
                }))
            );
        } else {
            setDialogConfig({ title, message, buttons });
            setDialogVisible(true);
        }
    }, []);

    const hideDialog = useCallback(() => {
        setDialogVisible(false);
    }, []);

    return {
        dialogVisible,
        dialogConfig,
        showDialog,
        hideDialog,
    };
};

export default useDialog;
