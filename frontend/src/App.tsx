import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Trends from './pages/Trends';
import SettlementDeepDive from './pages/SettlementDeepDive';
import MapPage from './pages/MapPage';
import ParcelDetail from './pages/ParcelDetail';
import Compare from './pages/Compare';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="search" element={<Search />} />
        <Route path="trends" element={<Trends />} />
        <Route path="settlement/:name" element={<SettlementDeepDive />} />
        <Route path="map" element={<MapPage />} />
        <Route path="parcel/:gush/:helka" element={<ParcelDetail />} />
        <Route path="compare" element={<Compare />} />
      </Route>
    </Routes>
  );
}

export default App;
