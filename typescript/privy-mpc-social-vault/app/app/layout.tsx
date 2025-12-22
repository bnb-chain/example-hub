import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Using Inter as a placeholder for modern fonts
import "./globals.css";
import PrivyWrapper from "./components/PrivyProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MPC Social Vault",
  description: "Secure Family Treasury on BNB Chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PrivyWrapper>
          {children}
        </PrivyWrapper>
      </body>
    </html>
  );
}
