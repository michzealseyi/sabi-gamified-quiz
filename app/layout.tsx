import type { Metadata } from "next";
import { Bricolage_Grotesque, Atkinson_Hyperlegible } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Sabi — learn, play, level up",
  description:
    "Quick quizzes on Nigeria, Africa, science and tech. Earn XP, unlock badges and climb the weekly leaderboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Nav />
        <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
