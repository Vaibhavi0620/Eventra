import React from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { EventsPage } from "./pages/EventsPage";
import { EventDetailsPage } from "./pages/EventDetailsPage";
import { MyTicketsPage } from "./pages/MyTicketsPage";
import { ResaleMarketplacePage } from "./pages/ResaleMarketplacePage";
import { OrganizerDashboardPage } from "./pages/OrganizerDashboardPage";
import { FraudDashboardPage } from "./pages/FraudDashboardPage";
import { QRVerificationPage } from "./pages/QRVerificationPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { BenchmarkDashboardPage } from "./pages/BenchmarkDashboardPage";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          {/* Public & Customer Experience Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailsPage />} />
          <Route path="/resale" element={<ResaleMarketplacePage />} />

          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTicketsPage />
              </ProtectedRoute>
            }
          />

          {/* Organizer & Admin Protected Operational Routes (Blocked for Customer USER role) */}
          <Route
            path="/organizer"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
                <OrganizerDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/fraud"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
                <FraudDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/verify"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
                <QRVerificationPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/benchmark"
            element={
              <ProtectedRoute allowedRoles={["ORGANIZER", "ADMIN"]}>
                <BenchmarkDashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </AuthProvider>
  );
};

export default App;
