import { Route, Routes } from 'react-router-dom';
import './App.css';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import CampiagnDetails from './pages/CampiagnDetails';
import CreateCampaign from './pages/CreateCampaign';

function App() {
  return (
    <div className="sm:-8 relative flex min-h-screen bg-[#13131a] lg:p-4">
      <div className="relative mr-10 ml-4 hidden sm:flex lg:ml-0">
        <Sidebar />
      </div>
      <div className="mx-auto max-w-7xl flex-1 max-sm:w-full sm:pr-5">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />}></Route>
          <Route path="/profile" element={<Profile />}></Route>
          <Route path="/create-campaign" element={<CreateCampaign />}></Route>
          <Route path="/campaign-details/:id" element={<CampiagnDetails />}></Route>
        </Routes>
      </div>
    </div>
  );
}

export default App;
