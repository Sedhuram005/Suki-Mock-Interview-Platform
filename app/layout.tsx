import type { Metadata } from "next";
import "./globals.css";
import NavigationLoader from "@/components/NavigationLoader";
import ClickSpark from "@/components/ClickSpark";

export const metadata: Metadata = {
  title: "Suki Software Solutions | AI Interview Assessment Portal",
  description: "Voice-based technical interview assessment portal by Suki Software Solutions.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/suki-mark.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

import MediaMockPolyfill from "@/components/MediaMockPolyfill";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <MediaMockPolyfill />
        <ClickSpark sparkColor="#ffffff" sparkSize={10} sparkRadius={15} sparkCount={8} duration={400}>
          <NavigationLoader />
          {children}
        </ClickSpark>
      </body>
    </html>
  );
}
