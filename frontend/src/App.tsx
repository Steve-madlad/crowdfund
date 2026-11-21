import { Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CampiagnDetails from './pages/CampiagnDetails';
import CreateCampaign from './pages/CreateCampaign';
import Help from './pages/Help';
import { useTheme } from './providers/useTheme';
import { Toaster } from 'sonner';
import RefundReminder from './components/RefundReminder';
import SeoMetadata from './components/SeoMetadata';

function App() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      <SeoMetadata />
      <RefundReminder />
      <div className="sm:-8 relative flex min-h-screen bg-background text-foreground lg:p-4">
        <div className="relative mr-10 ml-4 hidden sm:flex lg:ml-0">
          <Sidebar />
        </div>
        <div className="mx-auto max-w-7xl flex-1 max-sm:w-full sm:pr-5">
          <Navbar />
          <main className="min-w-0 px-4 pb-8 sm:px-0">
            <Routes>
              <Route path="/" element={<Home />}></Route>
              <Route path="/profile" element={<Profile />}></Route>
              <Route path="/create-campaign" element={<CreateCampaign />}></Route>
              <Route path="/campaign-details/:id" element={<CampiagnDetails />}></Route>
              <Route path="/help" element={<Help />}></Route>
            </Routes>
          </main>
        </div>
      </div>
      <Toaster closeButton position="top-right" richColors theme={resolvedTheme} />
    </>
  );
}

export default App;
