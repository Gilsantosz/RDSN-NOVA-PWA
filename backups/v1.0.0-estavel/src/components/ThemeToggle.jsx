import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useTheme } from '@/lib/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Alternar tema"
        >
            {theme === 'light' ? (
                <Moon className="h-5 w-5 text-slate-600" />
            ) : (
                <Sun className="h-5 w-5 text-slate-400" />
            )}
        </Button>
    );
}
