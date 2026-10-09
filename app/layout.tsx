import type { Metadata } from "next";
import { Geist_Mono, Google_Sans_Flex, Lexend } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const googleSansFlex = Google_Sans_Flex({
  variable: "--font-google-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PTE-Life | Luyện thi PTE Academic & PTE Core",
  description:
    "Nền tảng luyện đề PTE Academic và PTE Core của PTE-Life — luyện tập theo từng dạng câu hỏi, mocktest, chấm điểm AI.",
  icons: {
    icon: "/brand/icon-32.png",
    apple: "/brand/icon-180.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${googleSansFlex.variable} ${lexend.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
