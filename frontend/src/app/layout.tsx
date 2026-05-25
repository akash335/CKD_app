import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/lib/role-context";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/lib/theme-context";
import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { PushNotificationProvider } from "@/components/providers/PushNotificationProvider";


const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CKD Guardian — CKD Monitoring Dashboard",
  description:
    "Track kidney health, monitor CKD risk levels, and stay ahead of chronic kidney disease with intelligent insights.",
  keywords: ["CKD", "kidney health", "chronic kidney disease", "health dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col theme-bg theme-text-secondary theme-transition">
        <AuthProvider>
          <ThemeProvider>
            <RoleProvider>
              {/* Onboarding wraps everything as an overlay — pages are untouched */}
              <OnboardingProvider>
                <OnboardingGate />
                {/* Push notifications + in-app toasts — active only on native Android/iOS */}
                <PushNotificationProvider>
                  {children}
                </PushNotificationProvider>
              </OnboardingProvider>
            </RoleProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
