import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Crema from "./pages/Crema";
import Agent from "./pages/Agent";
import Audiences from "./pages/Audiences";
import CampaignList from "./pages/CampaignList";
import CampaignDetail from "./pages/CampaignDetail";
import Shoppers from "./pages/Shoppers";
import Analytics from "./pages/Analytics";
import Import from "./pages/Import";
import Automations from "./pages/Automations";
import ActivityFeed from "./pages/ActivityFeed";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/crema" element={<Crema />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/audiences" element={<Audiences />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/campaigns" element={<CampaignList />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/shoppers" element={<Shoppers />} />
          <Route path="/import" element={<Import />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
