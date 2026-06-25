import "../styles/theme.css";
import "../styles/dx-shader.css";
import "../styles/globals.css";

type RootLayoutProps = {
  children: any;
};

export const metadata = {
  title: "Shader",
  description: "Shader",
} as const;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="preload"
          href="/dx-shader/fonts/jetbrains-mono-latin-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script defer src="/dx-shader/js/palettes.js"></script>
        <script defer src="/dx-shader/js/shaders.js"></script>
        <script defer src="/dx-shader/js/engine.js"></script>
        <script defer src="/dx-shader/js/ui.js"></script>
        <script defer src="/dx-shader/js/main.js"></script>
        <script src="/sw-register.js"></script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
