import React, { useState } from "react";

/**
 * Displays the photograph assigned to this specific event. The imageUrl comes
 * from that event's own record, so Electro, Indie, Techno, etc. can all have
 * different images. Admins/organizers can change it from the event details page.
 */
export const EventArtwork: React.FC<{
  category: string;
  title?: string;
  imageUrl?: string;
  className?: string;
}> = ({ category, title, imageUrl, className = "w-full h-48" }) => {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(imageUrl) && !failed && !imageUrl?.endsWith("default-event.svg");

  return (
    <div className={`event-artwork relative overflow-hidden bg-bg-card select-none ${className}`}>
      {showPhoto ? (
        <img
          src={imageUrl}
          alt={title || `${category} event`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500"
        />
      ) : (
        <div className="event-artwork-fallback absolute inset-0 flex flex-col justify-end overflow-hidden p-5" aria-hidden="true">
          <span className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-accent-cyan">EVENTRA / LIVE</span>
          <span className="font-display text-[clamp(2.5rem,7vw,5rem)] font-extrabold uppercase leading-[.9] text-text-primary/75">
            {(category || "Live").replace(/_/g, " ")}
          </span>
          <span className="mt-3 text-xs text-text-secondary">Add an event photo from its details page</span>
        </div>
      )}
      {showPhoto && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-primary/35 via-transparent to-transparent" />}
    </div>
  );
};
