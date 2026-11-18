import { createContext } from 'react';
import type { ThemeContextValue } from '@/lib/theme';

export const ThemeContext = createContext<ThemeContextValue | null>(null);
