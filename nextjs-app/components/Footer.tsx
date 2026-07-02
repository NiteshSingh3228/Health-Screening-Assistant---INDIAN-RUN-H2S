import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-container w-full py-xl">
      <div className="max-w-7xl mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              medical_services
            </span>
            <span className="font-headline-md text-headline-md text-primary">Health Screening Assistant</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
            Empowering individuals with instant healthcare guidance and report analysis. Leading the future of
            preventative medicine through ethical AI.
          </p>
        </div>
        <div>
          <h5 className="font-headline-md text-headline-md text-on-surface mb-6">Resources</h5>
          <ul className="space-y-4">
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="#">Privacy Policy</Link></li>
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="#">Terms of Service</Link></li>
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="#">Help Center</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="font-headline-md text-headline-md text-on-surface mb-6">Support</h5>
          <ul className="space-y-4">
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="/emergency">Emergency Contacts</Link></li>
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="/doctors">Doctor Portal</Link></li>
            <li><Link className="text-on-surface-variant hover:text-tertiary transition-colors font-body-md text-body-md" href="/ai-assistant">AI Chat Assistant</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-margin-desktop mt-xl pt-lg border-t border-outline-variant/30">
        <p className="text-on-surface-variant font-body-md text-body-md text-center">
          © 2026 Health Screening Assistant. All rights reserved. <br />
          <span className="text-label-sm font-label-sm mt-2 block opacity-70">
            Medical Disclaimer: This tool is for informational purposes only and does not replace professional
            medical advice.
          </span>
        </p>
      </div>
    </footer>
  );
}
