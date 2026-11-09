import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (localStorage.getItem('careerPilotSetupRequired') === 'true' && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }
  return <Outlet />;
}