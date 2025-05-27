import HeaderAuth from "@/components/header-auth";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "sonner";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Voice AI Assistant",
  description: "Talk to AI using your voice",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-black text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Simple navbar with just auth */}
          <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-gray-800">
            <div className="container mx-auto px-4 py-2 flex justify-end">
              <HeaderAuth />
            </div>
          </nav>
          
          <main className="min-h-screen pt-16">
            {children}
          </main>
          
          {/* Sonner Toast Container */}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
