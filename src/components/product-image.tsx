"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK = "/images/placeholder.svg";

type Props = {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

/** Fixed 4:3 frame so every card lines up regardless of the source image. */
export function ProductImage({ src, alt, sizes, priority, className = "" }: Props) {
  const [source, setSource] = useState(src && src.trim() ? src : FALLBACK);

  return (
    <div className={`relative aspect-[4/3] w-full overflow-hidden bg-white ${className}`}>
      <Image
        src={source}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onError={() => setSource(FALLBACK)}
        className="object-contain p-3 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    </div>
  );
}
