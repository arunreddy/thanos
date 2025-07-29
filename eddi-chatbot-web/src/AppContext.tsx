import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {setCurrentUser} from "@/lib/api";
import { API_URL } from './lib/config';

interface UserRole {
    id:string;
    name:string;
}

interface UserGroup {
    id:string;
    name:string;
}

export interface User {
    id: string;
    sub: string;
    given_name: string;
    family_name: string;
    preffered_username: string;
    email: string;
    name: string;
    roles: UserRole[];
    groups: UserGroup[];
}


interface AppContextType {
    user: User | null;
    userEmail: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    fetchUser: (force:boolean) => Promise<User | null>;
    hasRole: (role: string) => boolean;
    isInGroup: (group: string) => boolean;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    signOut: () => void;
}

interface AppProviderProps {
    children: ReactNode;    
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUser = async (force:boolean=false):Promise<User | null> => {
        console.log("Fetching user data...");
        console.log("Force: ", force);

        const USER_API_URL = `${API_URL}/auth/user`;

        if (!force && user && !loading) {
            return user;
        }

        setLoading(true);
        try {
            const response = await fetch(USER_API_URL, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            console.log("Response: ", response);
            console.log("Response status: ", response.status);
            if (response.ok) {
                const data = await response.json();
                setUser(data);
                setIsAuthenticated(true);
                setError(null);
                
                // Set current user in API client for automatic user context
                setCurrentUser(data.email);
                
                return data.user;
            } else {
                setError('Failed to fetch user data');
                setIsAuthenticated(false);
                setUser(null);
                
                // Clear user from API client
                setCurrentUser(null);
                
                return null;
            }
        } catch (error) {
            setIsAuthenticated(false);
            setUser(null);
            // Clear user from API client
            setCurrentUser(null);
            
        } finally {
            setLoading(false); // Ensure loading is set to false
        }
        return null;
    }


    const signOut = async () => {

        try {
            const SIGNOUT_API_URL = `${API_URL}/auth/logout`;
            const response = await fetch(SIGNOUT_API_URL, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                setUser(null);
                setIsAuthenticated(false);
                // Clear user from API client
                setCurrentUser(null);
            } else {
                console.error('Failed to sign out');
            }
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };


    useEffect( ()  =>{
        fetchUser();
    }, [])


    const contextValue: AppContextType = {
        user,
        userEmail: user?.email || null,
        isAuthenticated,
        loading,
        error,
        fetchUser,
        hasRole: (role: string) => user ? user.roles.some((r) => r.name === role) : false,
        isInGroup: (group: string) => user ? user.groups.some((g) => g.name === group) : false,
        setUser,
        setLoading,
        signOut
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
}

export const useAppContext = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}

