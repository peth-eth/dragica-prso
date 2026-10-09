import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://dragicaprso.hr"),
  title: "Dragica Pršo",
  description: "Dragica Pršo, nezavisna gradska vijećnica u Puli.",
  openGraph: {
    type: "website",
    locale: "hr_HR",
    url: "/",
    title: "Dragica Pršo",
    description: "Dragica Pršo, nezavisna gradska vijećnica u Puli.",
    images: [
      {
        url: "/images/social-share.png",
        width: 1200,
        height: 630,
        alt: "Dragica Pršo ispred pulske Arene",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dragica Pršo",
    description: "Dragica Pršo, nezavisna gradska vijećnica u Puli.",
    images: ["/images/social-share.png"],
  },
  icons: {
    icon: [{ url: "/images/favicon.png", type: "image/png", sizes: "512x512" }],
    apple: "/images/favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  );
}
