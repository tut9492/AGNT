import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: number;
  linked?: boolean;
}

export default function Logo({ size = 40, linked = true }: LogoProps) {
  const logo = (
    <Image
      src="/logo.png"
      alt="AGNT"
      width={size}
      height={size}
      className="object-contain"
    />
  );

  if (linked) {
    return (
      <Link href="/" className="hover:opacity-70 transition-opacity">
        {logo}
      </Link>
    );
  }

  return logo;
}
