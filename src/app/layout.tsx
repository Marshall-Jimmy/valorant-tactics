import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from '@/components/I18nProvider';
import { ToastContainer } from '@/components/Toast';

export const metadata: Metadata = {
  title: "jimaVaroTactics - 无畏契约战术规划工具",
  description: "jimaVaroTactics（VaroTacts）是一款专业的无畏契约（Valorant）战术规划与点位标注工具，支持战术绘制、点位查询、策略管理等功能。",
  keywords: ["Valorant", "无畏契约", "战术规划", "点位", "lineup", "战术工具", "VaroTacts", "jimaVaroTactics"],
  authors: [{ name: "jimaVaroTactics" }],
  openGraph: {
    title: "jimaVaroTactics - 无畏契约战术规划工具",
    description: "专业的无畏契约战术规划与点位标注工具",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark" suppressHydrationWarning>
      <head>
        {/* Polyfill for Next.js getThemeColors error */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  window.__NEXT_DEVTOOLS_CONTEXT = window.__NEXT_DEVTOOLS_CONTEXT || {};
                  window.__NEXT_DEVTOOLS_CONTEXT.theme = window.__NEXT_DEVTOOLS_CONTEXT.theme || {
                    exportedColors: {
                      light: { background: '#ffffff', foreground: '#000000' },
                      dark: { background: '#09090b', foreground: '#fafafa' }
                    }
                  };
                }
              })();
            `,
          }}
        />
        {/* Preconnect to Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Load elegant Chinese fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-zinc-950 text-white overflow-hidden font-sans" suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
