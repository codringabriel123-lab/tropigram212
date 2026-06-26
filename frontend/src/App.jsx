import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import AuthPage from "./pages/AuthPage";
import FeedPage from "./pages/FeedPage";
import ExplorePage from "./pages/ExplorePage";
import MembersPage from "./pages/MembersPage";
import EventsPage from "./pages/EventsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import MessagesPage from "./pages/MessagesPage";
import SavedPostsPage from "./pages/SavedPostsPage";
import SettingsPage from "./pages/SettingsPage";
import TopPage from "./pages/TopPage";
import MinigamePage from "./pages/MinigamePage";
import Layout from "./components/Layout";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg, #0d0d0d)", color: "var(--accent, #e91e8c)", fontSize: 48 }}>
      🌴
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user?.isAdmin ? children : <Navigate to="/" replace />;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<FeedPage />} />
        <Route path="explore" element={<ExplorePage />} />
        <Route path="members" element={<MembersPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="profile/:id" element={<ProfilePage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="saved" element={<SavedPostsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="top" element={<TopPage />} />
        <Route path="minigame" element={<MinigamePage />} />
        <Route path="admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
