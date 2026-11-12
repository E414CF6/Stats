import type {Metadata} from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "EVEREST MC", description: "Live Stats Dashboard",
};

const themeInitScript = `
(function() {
  try {
    var saved = localStorage.getItem('everest-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = saved === 'dark' || (!saved || saved === 'system' ? prefersDark : false);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (<html lang="ko" suppressHydrationWarning>
        <head>
            <script dangerouslySetInnerHTML={{__html: themeInitScript}}/>
        </head>
        <body
            className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 antialiased selection:bg-cyan-500/20 selection:text-cyan-900 dark:selection:bg-cyan-500/30 dark:selection:text-cyan-200 transition-colors duration-200">
        {children}
        </body>
        </html>);
}
