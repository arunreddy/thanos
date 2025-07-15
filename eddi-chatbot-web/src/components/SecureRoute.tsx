

import { Outlet } from 'react-router-dom';
import Loading from '@/components/Loading';
import { useAppContext } from '@/AppContext';

export const RequiredAuth = () => {

  const {loading} = useAppContext();

  if (loading){
    return <Loading />;
  }

  // if (!isAuthenticated) {
  //   return <Navigate to="/login" />;
  // }

  return (<Outlet />);
}