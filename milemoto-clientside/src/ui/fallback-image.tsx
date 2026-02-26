'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type FallbackImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc: string;
};

export function FallbackImage({ src, fallbackSrc, onError, ...props }: FallbackImageProps) {
  const desiredSrc = src || fallbackSrc;
  const [resolvedSrc, setResolvedSrc] = useState<string>(desiredSrc);
  const [lastDesiredSrc, setLastDesiredSrc] = useState<string>(desiredSrc);

  if (lastDesiredSrc !== desiredSrc) {
    setLastDesiredSrc(desiredSrc);
    setResolvedSrc(desiredSrc);
  }

  return (
    <Image
      {...props}
      src={resolvedSrc}
      onError={event => {
        if (resolvedSrc !== fallbackSrc) {
          setResolvedSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
