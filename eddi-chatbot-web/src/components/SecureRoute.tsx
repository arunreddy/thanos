

import { Outlet } from 'react-router-dom';
import Loading from '@/components/Loading';
import { useAppContext } from '@/AppContext';
import { Navigate } from 'react-router';

export const RequiredAuth = () => {

  const {isAuthenticated,loading} = useAppContext();

  if (loading){
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (<Outlet />);
}