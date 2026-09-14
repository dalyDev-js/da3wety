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
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-heading",
});

export const fontClassName = `${fontSans.variable} ${fontHeading.variable}`;
