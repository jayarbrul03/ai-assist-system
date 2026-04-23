import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { PostHogProvider } from "@/components/shared/posthog-provider";
import { Toaster } from "sonner";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Parity — Balance for strata. Clarity for everyone.",
  description:
    "A neutral space between body corporate committees and lot owners in Queensland strata schemes. Clarity, fairness, and a lawyer-ready record — all in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} min-h-full flex flex-col font-sans antialiased`}
      >
        <PostHogProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            duration={12_000}
            toastOptions={{
              className: "font-sans",
            }}
          />
        </PostHogProvider>
      </body>
    </html>
  );
}
