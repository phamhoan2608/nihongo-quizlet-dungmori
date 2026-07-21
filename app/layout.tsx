import type { Metadata } from "next";
import "./globals.css";
import ThemeToggle from "@/components/ThemeToggle";
import Header from "@/components/Header";
import SearchPopup from "@/components/SearchPopup";
import SyncManager from "@/components/SyncManager";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "あ Minna Flashcards · Nhật N5",
  description:
    "Học từ vựng Minna no Nihongo N5 bằng flashcard, trắc nghiệm, nối cặp, điền từ và luyện viết.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply dark class before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')})()`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Zen+Maru+Gothic:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <SyncManager />
          <Header />
          <div className="pt-14">{children}</div>
          <SearchPopup />
          <ThemeToggle />
        </Providers>
      </body>
    </html>
  );
}
