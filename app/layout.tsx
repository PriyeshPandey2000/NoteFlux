import HeaderAuth from "@/components/header-auth";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "sonner";
import GridBackground from "@/components/ui/grid-background";

export const metadata = {
  title: "Noteflux",
  description: "Type more using your voice",
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
          <GridBackground>
          {/* Simple navbar with just auth */}
          <nav className="fixed top-0 w-full z-50 bg-black/50 backdrop-blur-md border-b border-gray-800">
            <div className="container mx-auto px-4 py-2 flex justify-end">
              <HeaderAuth />
            </div>
          </nav>
          
          <main className="min-h-screen pt-16">
            {children}
          </main>
          </GridBackground>
          
          {/* Sonner Toast Container */}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
