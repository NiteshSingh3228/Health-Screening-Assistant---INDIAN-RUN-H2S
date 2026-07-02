import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Screening Assistant | AI-Powered Medical Guidance",
  description: "Instantly check your symptoms, analyze medical reports with AI precision, and connect with trusted doctors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface">{children}</body>
    </html>
  );
}
