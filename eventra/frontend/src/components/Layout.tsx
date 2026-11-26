import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  Ticket,
  Wallet,
  LogOut,
  UserCheck,
  Menu,
  X,
  LayoutDashboard,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    logout,
    executionMode,
    setExecutionMode,
    connectedWallet,
    connectPublicWallet,
    disconnectWallet,
  } = useAuth();
  const navigate = useNavigate();

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletInput, setWalletInput] = useState("");
  const [walletError, setWalletError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOrganizerOrAdmin = user && (user.role === "ORGANIZER" || user.role === "ADMIN");
  const isAdmin = user && user.role === "ADMIN";

  const handleWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletError(null);
    try {
      await connectPublicWallet(walletInput);
      setWalletModalOpen(false);
      setWalletInput("");
    } catch (err: any) {
      setWalletError(err.message || "Failed to associate wallet address.");
    }
  };

  const detectInjectedSuiWallet = async () => {
    setWalletError(null);
    const anyWin = window as any;
    if (anyWin.suiWallet || anyWin.slush || anyWin.suiet) {
      try {
        const provider = anyWin.suiWallet || anyWin.slush || anyWin.suiet;
        const perms = await provider.requestPermissions?.();
        if (perms) {
          const accounts = await provider.getAccounts?.();
          if (accounts && accounts[0]) {
            await connectPublicWallet(accounts[0].address || accounts[0]);
            setWalletModalOpen(false);
            return;
          }
        }
      } catch (err: any) {
        setWalletError(err.message || "Browser wallet permission rejected.");
        return;
      }
    }
    setWalletError(
      "No injected Sui browser extension detected. Paste any public Sui Testnet address (0x...) below or use the sample Testnet address."
    );
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors border-b ${
      isActive
        ? "text-text-primary border-text-primary"
        : "text-text-secondary border-transparent hover:text-text-primary"
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary text-text-primary font-sans">
      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-bg-primary border-b border-border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Left: EVENTRA Wordmark & Logo */}
          <Link to="/" className="shrink-0 font-display text-3xl uppercase tracking-[0.12em] text-text-primary">
            Eventra
          </Link>

          {/* Center: Clean Customer Navigation + Role-Based Organizer/Admin Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            <NavLink to="/events" className={navLinkClass}>
              Explore Events
            </NavLink>
            <NavLink to="/resale" className={navLinkClass}>
              Marketplace
            </NavLink>
            <NavLink to="/my-tickets" className={navLinkClass}>
              My Tickets
            </NavLink>

            {isOrganizerOrAdmin && (
              <NavLink to="/organizer" className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-accent-violet" />
                  Organizer Dashboard
                </span>
              </NavLink>
            )}

            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-accent-cyan" />
                  Admin & Tech Overview
                </span>
              </NavLink>
            )}
          </nav>

          {/* Right: Connect Wallet & Account Section */}
          <div className="hidden md:flex items-center gap-3">
            {/* Mode Switcher only shown for Organizer/Admin or subtle toggle */}
            {isOrganizerOrAdmin && (
              <div
                className="inline-flex items-center rounded-xl bg-bg-secondary p-1 border border-border-muted text-xs"
                title="Switch between local demo simulation and live Sui Testnet transaction verification"
              >
                <button
                  type="button"
                  onClick={() => setExecutionMode("LOCAL_DEMO")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    executionMode === "LOCAL_DEMO"
                      ? "bg-bg-elevated text-text-primary border border-border-muted/80"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Demo
                </button>
                <button
                  type="button"
                  onClick={() => setExecutionMode("SUI_TESTNET")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                    executionMode === "SUI_TESTNET"
                      ? "bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />
                  Sui Testnet
                </button>
              </div>
            )}

            {/* Connect Wallet / Connected Wallet Indicator */}
            {connectedWallet ? (
              <div className="inline-flex items-center gap-2 rounded-xl bg-bg-card border border-border-muted px-3.5 py-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-status-success" />
                <span className="font-mono text-accent-cyan" title={connectedWallet}>
                  {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                </span>
                <button
                  type="button"
                  onClick={disconnectWallet}
                  className="text-text-secondary hover:text-text-primary ml-1 transition-colors"
                  title="Disconnect Wallet"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setWalletModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-bg-card hover:bg-bg-elevated border border-border-muted px-4 py-2 text-xs font-medium text-text-primary transition-colors"
              >
                <Wallet className="w-4 h-4 text-accent-cyan" />
                Connect Wallet
              </button>
            )}

            {/* User Profile / Sign In */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-bg-card border border-border-muted px-3 py-1.5 text-xs flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-accent-violet" />
                  <span className="font-medium text-text-primary">
                    {user.name.split(" ")[0]}
                  </span>
                  {isOrganizerOrAdmin && (
                    <span className="rounded-md bg-accent-violet/15 text-accent-violet px-1.5 py-0.5 text-[11px] font-medium">
                      {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                  className="rounded-xl bg-bg-card hover:bg-bg-elevated border border-border-muted p-2 text-text-secondary hover:text-text-primary transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/auth"
                className="rounded-full bg-text-primary hover:bg-white text-bg-primary text-sm font-medium px-6 py-2 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-xl bg-bg-card border border-border-muted p-2.5 text-text-secondary hover:text-text-primary"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border-muted bg-bg-secondary px-4 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Link
                to="/events"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated"
              >
                Explore Events
              </Link>
              <Link
                to="/resale"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated"
              >
                Marketplace
              </Link>
              <Link
                to="/my-tickets"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-sm font-medium text-text-primary hover:bg-bg-elevated"
              >
                My Tickets
              </Link>
              {isOrganizerOrAdmin && (
                <Link
                  to="/organizer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-sm font-medium text-accent-violet hover:bg-bg-elevated"
                >
                  Organizer Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-bg-card border border-border-muted px-4 py-2.5 text-sm font-medium text-accent-cyan hover:bg-bg-elevated"
                >
                  Admin & Technical Overview
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-border-muted flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWalletModalOpen(true);
                }}
                className="rounded-xl bg-bg-card border border-border-muted px-3.5 py-2 text-xs font-medium text-accent-cyan"
              >
                {connectedWallet
                  ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`
                  : "Connect Wallet"}
              </button>

              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="rounded-xl bg-bg-elevated border border-border-muted text-text-primary text-xs font-medium px-4 py-2"
                >
                  Sign Out ({user.name.split(" ")[0]})
                </button>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-accent-violet text-text-primary text-xs font-medium px-4 py-2"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Connect Sui Wallet Modal */}
      {walletModalOpen && (
        <div className="fixed inset-0 z-50 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-bg-card border border-border-muted p-6 shadow-card">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-muted">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-text-primary">
                    Connect Sui Wallet
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Link your public Sui address for NFT ticket ownership
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWalletModalOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-bg-secondary border border-border-muted p-3.5 text-xs text-text-secondary leading-relaxed mb-4">
              <strong className="text-text-primary">Safe & Non-Custodial:</strong> Wallet linking
              only associates your public Sui address (
              <code className="font-mono text-accent-cyan">0x...</code>) with your profile. EVENTRA
              never asks for private keys or seed phrases.
            </div>

            <button
              type="button"
              onClick={detectInjectedSuiWallet}
              className="w-full rounded-xl bg-accent-violet hover:bg-accent-violetHover text-text-primary font-medium text-sm py-2.5 px-4 mb-4 transition-colors"
            >
              Detect Browser Sui Extension
            </button>

            <form onSubmit={handleWalletSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Or enter a public Sui Testnet address
                </label>
                <input
                  type="text"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  placeholder="0x00cc3300000000000000000000000000000000000000000000000000000f4a01"
                  className="w-full rounded-xl border border-border-muted bg-bg-secondary px-3.5 py-2.5 text-xs font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent-violet"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setWalletInput(
                      "0x00cc3300000000000000000000000000000000000000000000000000000f4a01"
                    )
                  }
                  className="text-xs text-accent-cyan hover:underline"
                >
                  Use sample Testnet address
                </button>
              </div>

              {walletError && (
                <div className="rounded-xl border border-status-error/40 bg-status-error/10 p-3 text-xs text-status-error">
                  {walletError}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletModalOpen(false)}
                  className="rounded-xl border border-border-muted bg-bg-secondary hover:bg-bg-elevated px-4 py-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-bg-elevated hover:bg-accent-violet border border-border-muted text-text-primary px-4 py-2 text-xs font-medium transition-colors"
                >
                  Connect Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border-muted bg-bg-secondary mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-6 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-violet/20 border border-accent-violet/40 flex items-center justify-center text-accent-violet">
                <Ticket className="w-4 h-4" />
              </div>
              <span className="font-display font-bold text-lg text-text-primary">
                EVENTRA
              </span>
            </div>
            <p className="text-sm font-medium text-text-primary">
              Fair Access. Secure Tickets. Better Events.
            </p>
            <p className="text-xs text-text-secondary leading-relaxed max-w-md">
              Discover live concerts and events, own verifiable NFT tickets on the Sui blockchain,
              and trade fairly with smart-contract resale price limits.
            </p>
          </div>

          <div className="md:col-span-3">
            <h4 className="font-display font-semibold text-sm text-text-primary mb-3">
              Ticketing Platform
            </h4>
            <ul className="space-y-2 text-xs text-text-secondary">
              <li>
                <Link to="/events" className="hover:text-text-primary transition-colors">
                  Explore Events
                </Link>
              </li>
              <li>
                <Link to="/resale" className="hover:text-text-primary transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/my-tickets" className="hover:text-text-primary transition-colors">
                  My Tickets
                </Link>
              </li>
              {isOrganizerOrAdmin && (
                <li>
                  <Link to="/organizer" className="hover:text-accent-violet transition-colors">
                    Organizer Dashboard
                  </Link>
                </li>
              )}
              {isAdmin && (
                <li>
                  <Link to="/admin" className="hover:text-accent-cyan transition-colors">
                    Admin & Technical Overview
                  </Link>
                </li>
              )}
            </ul>
          </div>

          <div className="md:col-span-3 space-y-2">
            <h4 className="font-display font-semibold text-sm text-text-primary mb-3">
              Fan Protection
            </h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every ticket includes authentic NFT ownership, fair resale caps, and one-time QR gate
              admission to keep live events accessible for real fans.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
