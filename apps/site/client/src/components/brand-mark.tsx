import { cn } from "@/lib/utils";

/**
 * The RWA-ID mark.
 *
 * This is the same square "R" the dashboard and the claim page use, and the one
 * RWAIDv3 renders into every identity NFT onchain — so it is what shows up in
 * wallets and on marketplaces. The fingerprint icon it replaces appeared nowhere
 * else in the product.
 */
export function BrandMark({
  className,
  size = 24,
  tone = "ink",
}: {
  className?: string;
  size?: number;
  tone?: "ink" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center justify-center font-mono font-semibold leading-none",
        tone === "ink" ? "bg-foreground text-background" : "bg-primary text-primary-foreground",
        className,
      )}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        fontSize: Math.round(size * 0.5),
      }}
      aria-hidden="true"
    >
      R
    </span>
  );
}
