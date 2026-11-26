import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import {
  ShieldCheck,
  QrCode,
  ArrowRight,
  MapPin,
  Calendar,
  Sparkles,
  CheckCircle2,
  Compass,
  Ticket,
  Repeat,
} from "lucide-react";
import { apiRequest } from "../lib/api";
import { EventArtwork } from "../components/EventArtwork";

export const LandingPage: React.FC = () => {
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    apiRequest<{ events: any[] }>("/events")
      .then((res) => setFeaturedEvents(res.events.slice(0, 3)))
      .catch(() => setFeaturedEvents([]))
      .finally(() => setLoadingEvents(false));
  }, []);

  return (
    <div className="space-y-28 pb-12">
      {/* Hero: oversized wordmark over monochrome photography */}
      <section className="relative min-h-[calc(100svh-5rem)] flex flex-col bg-bg-primary overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt=""
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          className="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
        />
        <div className="relative flex-1 flex flex-col items-center justify-center text-center px-4 pt-10">
          <h1 className="font-display uppercase text-[clamp(4.5rem,24vw,22rem)] leading-[0.85] tracking-tight text-text-primary/80">
            Eventra
          </h1>
          <p className="mt-6 text-[11px] sm:text-xs uppercase tracking-[0.35em] text-text-secondary">
            Fair Access. Secure Tickets. Better Events.
          </p>
          <p className="mt-5 max-w-md text-sm text-text-secondary leading-relaxed">
            Tickets you actually own. Resale capped by smart contract. Every entry verified once.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/events"
              className="rounded-full bg-text-primary text-bg-primary text-sm font-medium px-8 py-3.5 hover:bg-white transition-colors"
            >
              Explore Events
            </Link>
            <Link
              to="/resale"
              className="rounded-full border border-text-primary/40 text-text-primary text-sm font-medium px-8 py-3.5 hover:border-text-primary transition-colors"
            >
              Marketplace
            </Link>
          </div>
        </div>
        <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-8 flex items-end justify-between text-[11px] uppercase tracking-[0.2em] text-text-secondary">
          <span>Sui NFT passes / Price-capped resale / AI-guarded</span>
          <a href="#how-it-works" className="hover:text-text-primary transition-colors">How it works</a>
        </div>
      </section>

      {/* Upcoming events: editorial grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 mb-10 border-b border-border-muted pb-5">
          <h2 className="text-5xl sm:text-7xl text-text-primary">Upcoming</h2>
          <Link to="/events" className="text-xs uppercase tracking-[0.2em] text-text-secondary hover:text-text-primary transition-colors pb-2">
            View all
          </Link>
        </div>

        {loadingEvents ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="aspect-[4/5] bg-bg-card animate-pulse" />
            ))}
          </div>
        ) : featuredEvents.length === 0 ? (
          <p className="py-16 text-text-secondary text-sm">No upcoming events yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
            {featuredEvents.map((ev) => (
              <Link key={ev.id} to={`/events/${ev.id}`} className="group block">
                <EventArtwork
                  category={ev.category}
                  title={ev.name}
                  imageUrl={ev.imageUrl}
                  className="w-full aspect-[4/5]"
                />
                <div className="pt-5">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-text-secondary">
                    {ev.category}
                  </div>
                  <h3 className="mt-2 font-display uppercase text-3xl sm:text-4xl text-text-primary group-hover:text-accent-violetLight transition-colors">
                    {ev.name}
                  </h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    {new Date(ev.startDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    {" / "}
                    {ev.venue}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border-muted flex items-baseline justify-between text-sm">
                    <span className="text-text-primary">From {ev.originalPrice}</span>
                    <span className="text-text-secondary">Resale cap {ev.resaleCap}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-2xl bg-bg-secondary border border-border-muted p-8 sm:p-12">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-medium text-accent-cyan">Simple & Transparent</span>
            <h2 className="font-display text-3xl font-bold tracking-tight text-text-primary mt-1">
              How EVENTRA Works
            </h2>
            <p className="text-sm sm:text-base text-text-secondary mt-2">
              Built to feel effortless for fans while keeping scalpers and counterfeit tickets out.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-accent-violet">
                  01 — Discover
                </span>
                <Compass className="w-5 h-5 text-accent-cyan" />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary">
                Browse Verified Events
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Browse upcoming concerts, festivals, and live shows with transparent ticket supply
                and clear pricing from the start.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-accent-violet">
                  02 — Own
                </span>
                <Ticket className="w-5 h-5 text-accent-cyan" />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary">
                Receive Your Sui NFT Pass
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Purchase a ticket and receive a verifiable NFT pass on the Sui blockchain with
                authentic ownership stored in your account.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-accent-violet">
                  03 — Trade Fairly
                </span>
                <Repeat className="w-5 h-5 text-accent-cyan" />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary">
                Resell Within Fair Limits
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Plans changed? Resell your ticket within smart-contract price limits while AI
                monitors for bots and suspicious bulk buying.
              </p>
            </div>

            <div className="rounded-2xl bg-bg-card border border-border-muted p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-sm text-accent-violet">
                  04 — Verify
                </span>
                <QrCode className="w-5 h-5 text-accent-cyan" />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary">
                Scan QR at the Venue
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Present your dynamic QR code at the venue entrance for instant, one-time admission
                that prevents duplicate scans.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
