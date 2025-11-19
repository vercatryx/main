'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { themes } from '@/styles/theme';
import React from 'react';

function camelToKebab(str: string) {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
}

function generateThemeCss() {
    return Object.entries(themes)
        .map(([name, vars]) => {
            const cssVars = Object.entries(vars)
                .map(([k, v]) => `--${camelToKebab(k)}: ${v};`)
                .join('');

            // 'light' is default (:root), others are classes
            if (name === 'light') {
                return `:root { ${cssVars} }`;
            }
            return `.${name} { ${cssVars} }`;
        })
        .join('\n');
}

export function ThemeRegistry() {
    useServerInsertedHTML(() => {
        return (
            <style
                dangerouslySetInnerHTML={{
                    __html: generateThemeCss(),
                }}
            />
        );
    });

    // Also render it on the client for hydration/navigation
    return (
        <style
            dangerouslySetInnerHTML={{
                __html: generateThemeCss(),
            }}
        />
    );
}
