import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import UploadWidget from './UploadWidget';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      {/* Nested routes render their page content here. */}
      <main className="flex-1">
        <Outlet />
      </main>
      <UploadWidget />
    </div>
  );
};

export default Layout;