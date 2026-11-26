import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Calendar, Ticket, ArrowRight } from "lucide-react";
import { apiRequest } from "../lib/api";
import { EventArtwork } from "../components/EventArtwork";

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sortBy, setSortBy] = useState("date_asc");

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiRequest<{ events: any[] }>("/events")
      .then((res) => setEvents(res.events))
      .catch((err) => setError(err.message || "Failed to load events"))
      .finally(() => setLoading(false));
  }, []);

  const filteredEvents = events
    .filter((ev) => {
      const matchesSearch =
        !search.trim() ||
        ev.name.toLowerCase().includes(search.toLowerCase()) ||
        ev.venue.toLowerCase().includes(search.toLowerCase()) ||
        ev.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        category === "ALL" || ev.category.toUpperCase() === category.toUpperCase();
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === "price_asc") return a.originalPrice - b.originalPrice;
      if (sortBy === "price_desc") return b.originalPrice - a.originalPrice;
      if (sortBy === "availability") return b.ticketsAvailable - a.ticketsAvailable;
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-border-muted">
        <div>
          <span className="text-xs font-medium text-accent-violet">
            Verified On-Chain Events
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-text-primary mt-1">
            Find Your Next Experience
          </h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1.5">
            Discover events. Secure your place. Own your ticket.
          </p>
        </div>
        <div className="rounded-xl bg-bg-card border border-border-muted px-4 py-2 text-xs text-text-secondary">
          Showing <strong className="text-text-primary">{filteredEvents.length}</strong> of{" "}
          {events.length} upcoming events
        </div>
      </div>

      {/* Search, Category Filter & Sorting Bar */}
      <div className="rounded-2xl bg-bg-card border border-border-muted p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label
            htmlFor="event-search-input"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            Search events or venues
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-text-secondary" />
            <input
              id="event-search-input"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by artist, event title, or city..."
              className="w-full rounded-xl border border-border-muted bg-bg-secondary pl-10 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:border-accent-violet transition-colors"
            />
          </div>
        </div>

        <div className="md:col-span-4">
          <label
            htmlFor="category-filter"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            Category
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
          >
            <option value="ALL">All Categories</option>
            <option value="ELECTRONIC">Electronic</option>
            <option value="INDIE_ROCK">Indie Rock</option>
            <option value="CLASSICAL">Classical</option>
            <option value="FESTIVAL">Festival</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <label
            htmlFor="sort-select"
            className="block text-xs font-medium text-text-secondary mb-1.5"
          >
            Sort by
          </label>
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-violet"
          >
            <option value="date_asc">Date: Earliest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="availability">Availability: Most Left</option>
          </select>
        </div>
      </div>

      {/* States: Loading, Error, Empty, Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="rounded-2xl bg-bg-card border border-border-muted h-96 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-status-error/40 bg-status-error/10 p-6 text-sm text-status-error"
        >
          <strong>Unable to load events:</strong> {error}
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-2xl bg-bg-card border border-border-muted p-12 text-center space-y-4">
          <div className="font-display text-lg font-bold text-text-primary">
            No matching events found
          </div>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Try clearing your search term or selecting "All Categories" to view all upcoming
            concerts and live shows.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategory("ALL");
            }}
            className="rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="group rounded-2xl bg-bg-card border border-border-muted hover:border-accent-violet/50 overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-card"
            >
              <div>
                <div className="relative">
                  <EventArtwork category={ev.category} title={ev.name} imageUrl={ev.imageUrl} className="w-full h-44" />
                  <div className="absolute top-3 left-3 rounded-lg bg-bg-primary/80 backdrop-blur-md border border-border-muted px-2.5 py-1 text-xs font-medium text-text-primary">
                    {ev.category.replace("_", " ")}
                  </div>
                  <div
                    className={`absolute top-3 right-3 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                      ev.status === "UPCOMING" || ev.status === "ACTIVE"
                        ? "bg-status-success/15 text-status-success border-status-success/30"
                        : "bg-bg-primary/80 text-text-secondary border-border-muted"
                    }`}
                  >
                    {ev.status === "UPCOMING" ? "Upcoming" : ev.status}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h2 className="font-display text-lg font-bold text-text-primary group-hover:text-accent-violet transition-colors leading-snug">
                    {ev.name}
                  </h2>
                  <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>

                  <div className="pt-3 space-y-2 text-xs text-text-secondary border-t border-border-muted/70">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                      <span>{new Date(ev.startDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                      <span>
                        <strong className="text-text-primary">{ev.ticketsAvailable}</strong> of{" "}
                        {ev.totalTickets} tickets remaining
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border-muted bg-bg-secondary/60 px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-text-secondary">Ticket Price</div>
                  <div className="font-display text-base font-bold text-text-primary">
                    {ev.originalPrice} <span className="text-xs font-normal text-text-secondary">units</span>
                  </div>
                  <div className="text-[11px] text-accent-cyan">
                    Resale Cap: {ev.resaleCap} units
                  </div>
                </div>

                <Link
                  to={`/events/${ev.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary px-4 py-2.5 text-xs font-medium transition-colors"
                >
                  Get Tickets
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
