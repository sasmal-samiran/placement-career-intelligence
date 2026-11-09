import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import StudentProfile from './pages/StudentProfile';
import AcademicPerformance from './pages/AcademicPerformance';
import Skills from './pages/Skills';
import ConductTest from './pages/ConductTest';
import Projects from './pages/Projects';
import Internships from './pages/Internships';
import Certifications from './pages/Certifications';
import CodingProfile from './pages/CodingProfile';
import ResumePortfolio from './pages/ResumePortfolio';
import PlacementPrediction from './pages/PlacementPrediction';
import CareerMentor from './pages/CareerMentor';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<ProfileSetup />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<StudentProfile />} />
        <Route path="/academic" element={<AcademicPerformance />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/conduct-test" element={<ConductTest />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/internships" element={<Internships />} />
        <Route path="/certifications" element={<Certifications />} />
        <Route path="/coding" element={<CodingProfile />} />
        <Route path="/resume" element={<ResumePortfolio />} />
        <Route path="/placement" element={<PlacementPrediction />} />
        <Route path="/mentor" element={<CareerMentor />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}