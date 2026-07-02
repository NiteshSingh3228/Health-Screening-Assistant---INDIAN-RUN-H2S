"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/symptom-checker", label: "AI Symptom Checker" },
  { href: "/report-analysis", label: "AI Report Analysis" },
  { href: "/ai-assistant", label: "AI Assistant" },
  { href: "/doctors", label: "Doctors" },
  { href: "/appointments", label: "Appointments" },
  { href: "/emergency", label: "Emergency" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 w-full z-50 shadow-sm bg-surface-container-lowest h-20">
      <nav className="max-w-7xl mx-auto px-margin-desktop flex justify-between items-center h-full">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            medical_services
          </span>
          <span className="text-headline-md font-headline-md text-primary">Health Screening Assistant</span>
        </Link>
        <div className="hidden lg:flex items-center gap-8">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  active
                    ? "text-primary border-b-2 border-primary pb-1 font-label-md text-label-md"
                    : "text-on-surface-variant hover:text-primary transition-colors duration-200 font-label-md text-label-md"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="px-6 py-2 text-primary font-label-md text-label-md hover:bg-primary-fixed transition-colors rounded-xl">
            Profile
          </Link>
        </div>
      </nav>
    </header>
  );
}
