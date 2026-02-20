import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PortfolioScreen from './screens/PortfolioScreen'
import SiteDetailScreen from './screens/SiteDetailScreen'
import InverterScreen from './screens/InverterScreen'
import AlertsScreen from './screens/AlertsScreen'
import RevenueScreen from './screens/RevenueScreen'
import HistoryScreen from './screens/HistoryScreen'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PortfolioScreen />} />
        <Route path="/sites/:plantUid" element={<SiteDetailScreen />} />
        <Route path="/sites/:plantUid/inverters" element={<InverterScreen />} />
        <Route path="/alerts" element={<AlertsScreen />} />
        <Route path="/revenue" element={<RevenueScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/sites/:plantUid/history" element={<HistoryScreen />} />
      </Routes>
    </Layout>
  )
}
