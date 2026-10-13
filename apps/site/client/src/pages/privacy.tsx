import { Link } from "wouter";
import { BrandMark } from "@/components/brand-mark";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16">
            <Link href="/" className="flex items-center gap-2">
              <BrandMark size={30} />
              <span className="font-heading text-xl font-bold">RWA-ID</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Last updated: January 8, 2026
            </p>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">1. Introduction</h2>
              <p className="text-muted-foreground">
                RWA-ID ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our decentralized identity registry platform.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">2. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect minimal information necessary to provide our services:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Contact Details:</strong> The name, email, organization and message you submit through the contact form on this site.</li>
                <li><strong>Wallet Addresses:</strong> Public blockchain addresses, collected only in the RWA-ID dashboard — not on this website.</li>
                <li><strong>Identity Names:</strong> Names associated with identity claims you create or receive.</li>
                <li><strong>Transaction Data:</strong> On-chain transaction hashes related to identity minting.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use collected information to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Verify eligibility for identity claims via Merkle proof verification.</li>
                <li>Generate and store Merkle trees for allowlist management.</li>
                <li>Facilitate on-chain identity token minting on Ethereum Mainnet.</li>
                <li>Provide customer support when requested.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">4. Blockchain Data</h2>
              <p className="text-muted-foreground">
                Please note that blockchain transactions are public and immutable. Once an identity token is minted on Ethereum, the transaction and associated data become permanently visible on the public blockchain. We cannot delete or modify on-chain data.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">5. Data Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or rent your personal information. We may share information only:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>With your consent or at your direction.</li>
                <li>To comply with legal obligations or valid legal processes.</li>
                <li>To protect our rights, privacy, safety, or property.</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">6. Data Security</h2>
              <p className="text-muted-foreground">
                We implement industry-standard security measures to protect your information. However, no method of transmission over the internet or electronic storage is 100% secure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">7. Third-Party Services</h2>
              <p className="text-muted-foreground">
                This website does not connect to your wallet. Wallet connections happen in the RWA-ID dashboard, a separate application with its own privacy policy, which we encourage you to review.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">8. Your Rights</h2>
              <p className="text-muted-foreground">
                Depending on your jurisdiction, you may have rights to access, correct, or delete your personal information. For off-chain data requests, please contact us at{" "}
                <a href="mailto:partner@rwa-id.com" className="text-primary hover:underline">
                  partner@rwa-id.com
                </a>.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">9. Changes to This Policy</h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated "Last updated" date.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="font-heading text-xl font-semibold">10. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at{" "}
                <a href="mailto:partner@rwa-id.com" className="text-primary hover:underline">
                  partner@rwa-id.com
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <BrandMark size={20} />
              <span className="font-heading font-semibold">RWA-ID</span>
            </div>
            <p>Decentralized Identity Registry for Real World Assets</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
