import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MapPage from './pages/MapPage';
import StopSearchPage from './pages/StopSearchPage';
import OperatorDashboard from './pages/OperatorDashboard';
import LoginPage from './pages/LoginPage';
import PassengerRouteSearch from './pages/PassengerRouteSearch';
import PassengerRouteTracking from './pages/PassengerRouteTracking';
import PassengerNotifications from './pages/PassengerNotifications';
import DriverDashboard from './pages/DriverDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="stops" element={<StopSearchPage />} />
        <Route path="operator" element={<OperatorDashboard />} />
        {/* Passenger Routes */}
        <Route path="passenger/search" element={<PassengerRouteSearch />} />
        <Route path="passenger/route/:routeId" element={<PassengerRouteTracking />} />
        <Route path="passenger/notifications" element={<PassengerNotifications />} />
        {/* Driver Routes */}
        <Route path="driver" element={<DriverDashboard />} />
        {/* Admin Routes */}
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}

export default App;

