import './globals.css';
import type { Metadata } from 'next';
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google';

/*
 * Font loading per visual_system.md §3 type families (Path A — spec wins).
 *
 * The spec optimizes for legibility and editorial weight per use case, NOT for
 * single-family-system coherence. Each family is selected for its role:
 *   Inter (sans)              — infrastructure: UI chrome, labels, headings, navigation
 *   Source Serif 4 (serif)    — editorial heavy-lifting: Examiner Notes hero per Decision 37 +
 *                                visual_system.md §5.3. The institutional register is carried
 *                                by this serif treatment on hero content.
 *   JetBrains Mono (mono)     — structured-artifact signal: rule IDs, threshold arithmetic,
 *                                audit reference IDs, JSON / data blocks
 *
 * "Source Serif Pro" was renamed to "Source Serif 4" on Google Fonts (per Task 0.1.5 web-search
 * verification); the spec's family-stack still names 'Source Serif Pro' as the CSS family identifier,
 * which next/font/google's Source_Serif_4 export maps to correctly under the hood.
 *
 * Bridge convention: --font-{family}-loaded variables (per plan recipe convention, not spec-mandated)
 * link next/font's auto-generated family names into the @theme stacks defined in globals.css.
 */

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-loaded',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif-loaded',
  display: 'swap',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'KYC Tier Decisioning — Shift Atlas',
  description: 'Three-pass reasoning pipeline demo for Philippine bank compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable} ${jetBrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
