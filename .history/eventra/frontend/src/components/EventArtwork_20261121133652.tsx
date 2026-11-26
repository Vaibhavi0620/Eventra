import React, { useState } from "react";

/**
 * Event image. Renders real photography in monochrome (colour on hover) when an
 * imageUrl is available; otherwise a flat charcoal panel with oversized category type.
 * No gradients, glows or generated illustration.
 */
export const EventArtwork: React.FC<{
  category: string;
  title?: string;
  imageUrl?: string;
  className?: string;
}> = ({ category, title, imageUrl, className = "w-full h-48" }) => {
  const [failed, setFailed] = useState(false);
  const showPhoto = imageUrl && !failed && !imageUrl.endsWith("default-event.svg");

  return (
    <div className={`relative overflow-hidden bg-bg-card select-none ${className}`}>
      {showPhoto ? (
        <img
          src={imageUrl}
          alt={title || category}
          onError={() => setFailed(true)}
          className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500"
        />
      ) : (
        <div className="absolute inset-0 flex items-end p-4" aria-hidden="true">
          <span className="font-display uppercase text-[clamp(3rem,9vw,6rem)] leading-none text-bg-elevated">
            {(category || "Live").toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
};
