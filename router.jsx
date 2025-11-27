import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';



const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'patients',
        element: <Patients />,
      },
    ],
  },
  { path: '/unauthorized', element: <Unauthorized /> },
]);

export default router;