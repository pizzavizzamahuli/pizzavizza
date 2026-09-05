export interface WebsiteAppearance {
  preset: 'default' | 'warm' | 'dark' | 'elegant' | 'minimal' | 'custom';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    headerBackground: string;
    headerText: string;
    footerBackground: string;
    footerText: string;
    footerAccent: string;
    buttonBackground: string;
    buttonText: string;
    buttonHover: string;
    link: string;
    heading: string;
    body: string;
    border: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  radius: 'sharp' | 'soft' | 'rounded' | 'extra-rounded';
  shadow: 'none' | 'subtle' | 'medium' | 'strong';
  typography: { fontFamily: 'system' | 'serif' | 'modern'; baseFontSize: number; headingWeight: 600 | 700 | 800 };
  header: { height: 'compact' | 'comfortable'; logoSize: 'small' | 'medium' | 'large' };
  footer: { spacing: 'compact' | 'comfortable'; logoSize: 'small' | 'medium' | 'large' };
}

export type WebsiteAppearanceInput = Partial<Omit<WebsiteAppearance, 'colors' | 'typography' | 'header' | 'footer'>> & {
  colors?: Partial<WebsiteAppearance['colors']>;
  typography?: Partial<WebsiteAppearance['typography']>;
  header?: Partial<WebsiteAppearance['header']>;
  footer?: Partial<WebsiteAppearance['footer']>;
};

export const defaultWebsiteAppearance: WebsiteAppearance = {
  preset: 'default',
  colors: {
    primary: '#f59e0b', secondary: '#1c1917', accent: '#d97706', background: '#f5f5f4', surface: '#ffffff',
    headerBackground: '#ffffff', headerText: '#171717', footerBackground: '#0c0a09', footerText: '#d6d3d1', footerAccent: '#fbbf24',
    buttonBackground: '#1c1917', buttonText: '#ffffff', buttonHover: '#44403c', link: '#b45309', heading: '#171717', body: '#44403c',
    border: '#e7e5e4', success: '#047857', warning: '#b45309', error: '#be123c', info: '#0369a1',
  },
  radius: 'rounded', shadow: 'subtle', typography: { fontFamily: 'system', baseFontSize: 16, headingWeight: 700 },
  header: { height: 'comfortable', logoSize: 'medium' }, footer: { spacing: 'comfortable', logoSize: 'medium' },
};

export function mergeWebsiteAppearance(value?: WebsiteAppearanceInput | null): WebsiteAppearance {
  return {
    ...defaultWebsiteAppearance,
    ...value,
    colors: { ...defaultWebsiteAppearance.colors, ...(value?.colors || {}) },
    typography: { ...defaultWebsiteAppearance.typography, ...(value?.typography || {}) },
    header: { ...defaultWebsiteAppearance.header, ...(value?.header || {}) },
    footer: { ...defaultWebsiteAppearance.footer, ...(value?.footer || {}) },
  } as WebsiteAppearance;
}
