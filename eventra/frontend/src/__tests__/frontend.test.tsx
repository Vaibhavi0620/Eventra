import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

const mockEvents = [
  {
    id: "evt-1",
    name: "SONIC HORIZONS // Analog Modular Synthesis Night",
    description: "Quadraphonic modular showcase",
    category: "ELECTRONIC",
    venue: "Bikaner House Acoustic Pavilion, New Delhi",
    startDate: "2026-11-14T19:30:00.000Z",
    endDate: "2026-11-14T23:45:00.000Z",
    totalTickets: 120,
    ticketsAvailable: 116,
    originalPrice: 1000,
    resaleCap: 1200,
    status: "UPCOMING",
  },
  {
    id: "evt-2",
    name: "NOCTURNE IN CHARCOAL // String Quartet",
    description: "Acoustic string quartet",
    category: "CLASSICAL",
    venue: "NCPA Experimental Theatre, Mumbai",
    startDate: "2026-12-05T18:30:00.000Z",
    endDate: "2026-12-05T21:30:00.000Z",
    totalTickets: 80,
    ticketsAvailable: 79,
    originalPrice: 1200,
    resaleCap: 1380,
    status: "UPCOMING",
  },
];

const mockTickets = [
  {
    id: "tkt-1",
    eventId: "evt-1",
    seatNumber: "MOD-001",
    tierName: "Quadraphonic Floor",
    originalPrice: 1000,
    maximumResalePrice: 1200,
    currentStatus: "ACTIVE",
    blockchain: "SIMULATED_LOCAL",
    nftObjectId: null,
    qrPayload: '{"v":1,"sys":"EVENTRA","tid":"tkt-1"}',
    event: mockEvents[0],
    currentOwner: { name: "Arjun Mehta", email: "arjun@eventra.edu" },
  },
  {
    id: "tkt-2",
    eventId: "evt-1",
    seatNumber: "MOD-003",
    tierName: "Quadraphonic Floor",
    originalPrice: 1000,
    maximumResalePrice: 1200,
    currentStatus: "USED",
    blockchain: "SIMULATED_LOCAL",
    nftObjectId: null,
    qrPayload: '{"v":1,"sys":"EVENTRA","tid":"tkt-2"}',
    event: mockEvents[0],
    currentOwner: { name: "Arjun Mehta", email: "arjun@eventra.edu" },
  },
];

describe("EVENTRA Frontend Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("1. Renders Landing Page with customer navigation, tagline, and hero CTAs without exposing organizer tools", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ events: mockEvents }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/EVENTRA/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Fair Access\. Secure Tickets\. Better Events\./i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Explore Events/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Marketplace/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /My Tickets/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Connect Wallet/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Organizer Dashboard/i })).not.toBeInTheDocument();
  });

  it("2. Validates Auth form inputs and displays clear error states", async () => {
    render(
      <MemoryRouter initialEntries={["/auth"]}>
        <App />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/Email Address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole("button", { name: /Sign In to EVENTRA/i });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(passwordInput, { target: { value: "123" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid email/i);
  });

  it("3. Filters Events by search query and category", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ events: mockEvents }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/events"]}>
        <App />
      </MemoryRouter>
    );

    const headings = await screen.findAllByText(
      /SONIC HORIZONS \/\/ Analog Modular Synthesis Night/i
    );
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/NOCTURNE IN CHARCOAL/i).length).toBeGreaterThan(0);

    const searchInput = screen.getByLabelText(/Search events or venues/i);
    fireEvent.change(searchInput, { target: { value: "NOCTURNE" } });

    expect(screen.getAllByText(/NOCTURNE IN CHARCOAL/i).length).toBeGreaterThan(0);
    expect(
      screen.queryAllByText(/SONIC HORIZONS \/\/ Analog Modular Synthesis Night/i)
    ).toHaveLength(0);
  });

  it("4. Displays authenticated My Tickets state and filters by ACTIVE vs USED status", async () => {
    localStorage.setItem("eventra_token", "mock-jwt-token");

    vi.spyOn(global, "fetch").mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes("/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: "u1",
              name: "Arjun Mehta",
              email: "arjun@eventra.edu",
              role: "USER",
            },
          }),
        } as Response;
      }
      if (url.includes("/tickets/my")) {
        return {
          ok: true,
          json: async () => ({ tickets: mockTickets }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText("MOD-001")).toBeInTheDocument();
    expect(screen.getByText("MOD-003")).toBeInTheDocument();

    const usedFilterBtn = screen.getByRole("button", { name: /^Used$/i });
    fireEvent.click(usedFilterBtn);

    await waitFor(() => {
      expect(screen.queryByText("MOD-001")).not.toBeInTheDocument();
      expect(screen.getByText("MOD-003")).toBeInTheDocument();
    });
  });

  it("5. Blocks Customer (USER) from accessing Organizer Dashboard via direct URL", async () => {
    localStorage.setItem("eventra_token", "mock-jwt-token");

    vi.spyOn(global, "fetch").mockImplementation(async (input: any) => {
      const url = String(input);
      if (url.includes("/auth/me")) {
        return {
          ok: true,
          json: async () => ({
            user: {
              id: "u1",
              name: "Arjun Mehta",
              email: "arjun@eventra.edu",
              role: "USER",
            },
          }),
        } as Response;
      }
      return { ok: true, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={["/organizer"]}>
        <App />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/Organizer or Administrator Permissions Required/i)
    ).toBeInTheDocument();
  });

  it("6. Displays API error states when event catalog fetch fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Database connection unavailable" }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/events"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Database connection unavailable/i
    );
  });
});
