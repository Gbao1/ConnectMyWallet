import './index.css';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import FinanceDashboardPage from './pages/FinanceDashboardPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FinanceDashboardPage />} />
        <Route path="/dashboard" element={<FinanceDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
