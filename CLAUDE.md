# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 application with React + TypeScript for the frontend and backend. It uses Tailwind CSS for styling and Radix UI components. The project was originally generated from a Figma design and migrated from Vite to Next.js.

## Development Commands

- **Install dependencies**: `npm i`
- **Start dev server**: `npm run dev` (runs on http://localhost:3000) (only the user should run this)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Run linter**: `npm run lint`

## Architecture

### Next.js App Router Structure

The application uses the Next.js App Router with the following structure:

- **`src/app/layout.tsx`** - Root layout wrapping the app with ThemeProvider
- **`src/app/page.tsx`** - Home page composing all landing sections
- **`src/components/`** - All React components (section components in root, UI components in `ui/` subdirectory)
- **`src/contexts/`** - React context providers (theme context)
- **`src/styles/globals.css`** - Global styles with Tailwind CSS
- **`public/`** - Static assets (images, logos)

### Page Structure

The home page (`src/app/page.tsx`) follows a single-page layout pattern with sections:

- **Navigation** - sticky header with theme toggle (client component)
- **Hero** - main landing section
- **WhatWeDo** - services overview
- **HowItWorks** - process explanation
- **CrmSection** - CRM features showcase
- **WhoItsFor** - target audience section
- **GetStarted** - call-to-action section
- **Footer** - site footer

### Client vs Server Components

- **Client Components** (with `"use client"` directive):
  - `src/components/navigation.tsx` - Uses interactive theme toggle
  - `src/contexts/theme-context.tsx` - Uses React hooks and state
  - Most UI components in `src/components/ui/` that use interactivity

- **Server Components** (default):
  - `src/app/page.tsx` - Main page composition
  - `src/app/layout.tsx` - Root layout
  - Static section components

### Theming System

Theme management is handled via a custom React context in `src/contexts/theme-context.tsx`:

- Client component using `"use client"` directive
- Provides `useTheme()` hook for accessing current theme and toggle function
- Defaults to dark mode
- Applies `dark` class to `document.documentElement` for dark mode styling
- Compatible with Next.js server-side rendering with `suppressHydrationWarning` on `<html>` tag

Tailwind CSS is configured with `darkMode: 'class'` and custom CSS variables for colors, spacing, and design tokens in `src/styles/globals.css`.

### UI Components

The `src/components/ui/` directory contains Radix UI primitives wrapped with Tailwind styling, following the shadcn/ui pattern.

### TypeScript Configuration

- Path alias `@/*` → `./src/*` for absolute imports
- Next.js TypeScript plugin enabled
- Strict mode enabled

## Key Technical Details

- **Next.js 15**: Latest App Router with React Server Components by default
- **Image Optimization**: Uses Next.js `Image` component for optimized images from `/public`
- **No testing framework**: Tests are not configured
- **No linting config beyond Next.js defaults**: Uses built-in Next.js ESLint configuration
- **Tailwind CSS v3**: Standard Tailwind with custom design tokens
- **Static Assets**: Located in `/public` directory (e.g., `/logo-small.png`, `/logo-big.png`)
