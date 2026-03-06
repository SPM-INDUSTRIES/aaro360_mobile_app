export interface ThemeColors {
    primary: string;
    deepBlue: string;
    backgroundLight: string;
    backgroundDark: string;
    white: string;
    textDark: string;
    textGray: string;
    border: string;
    shadow: string;
    overlay: string;
    card: string;
    cardDark: string;
    orangeLight: string;
    greenLight: string;
    blueLight: string;
    greenText: string;
    blueText: string;
}

export const Colors: ThemeColors = {
    primary: '#fa6521',
    deepBlue: '#1a4968',
    backgroundLight: '#f8f7f5',
    backgroundDark: '#221c10',
    white: '#FFFFFF',
    textDark: '#1c160d',
    textGray: '#666',
    border: '#E0E0E0',
    shadow: 'rgba(0, 0, 0, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    card: '#FFFFFF',
    cardDark: '#1c1c1c',
    orangeLight: '#FFF7ED',
    greenLight: '#F0FDF4',
    blueLight: '#EFF6FF',
    greenText: '#16A34A',
    blueText: '#2563EB',
};

export const Theme = {
    colors: Colors,
    borderRadius: {
        sm: 4,
        md: 8,
        lg: 16,
        xl: 24,
        full: 9999,
    },
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 5,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5,
        },
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 20,
        xl: 24,
        xxl: 32,
    }
}

