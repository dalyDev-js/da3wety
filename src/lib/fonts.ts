import { Amiri, Cairo } from "next/font/google";

/**
 * Cairo: variable Arabic + Latin sans for UI and body text.
 * Amiri: classic Naskh display face for invitation headings.
 * Both expose CSS variables consumed by Tailwind's `@theme inline` in globals.css
 * (`font-sans` and `font-heading`).
 */
export const fontSans = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-sans",
});

export const fontHeading = Amiri({
  subsets: ["arabic", "latin"],
  // 400 only: Amiri bold costs ~100 KB and the display face reads better at regular
  // weight. Never pair font-heading with font-bold/semibold — the browser would
  // synthesise a faux bold.
  weight: ["400"],
  display: "swap",
  variable: "--font-heading",
});

export const fontClassName = `${fontSans.variable} ${fontHeading.variable}`;
