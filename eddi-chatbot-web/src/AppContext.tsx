import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {setCurrentUser} from "@/lib/api";

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

// Mock user for local development (bypassing authentication)
const MOCK_USER: User = {
    id: 'dev-user-001',
    sub: 'dev-user-001',
    given_name: 'Dev',
    family_name: 'User',
    preffered_username: 'devuser',
    email: 'dev.user@local.dev',
    name: 'Dev User',
    roles: [{ id: 'admin', name: 'admin' }],
    groups: [{ id: 'developers', name: 'developers' }],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    // Initialize with mock user for local development
    const [user, setUser] = useState<User | null>(MOCK_USER);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [error] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchUser = async (_force = false): Promise<User | null> => {
        // For local development, always return mock user
        console.log("Using mock user for local development");
        setUser(MOCK_USER);
        setIsAuthenticated(true);
        setLoading(false);
        setCurrentUser(MOCK_USER.email);
        return MOCK_USER;
    }


    const signOut = async () => {
        // For local development, just reset to mock user
        console.log("Sign out called - resetting to mock user for local dev");
        setUser(MOCK_USER);
        setIsAuthenticated(true);
    };


    useEffect(() => {
        // Set mock user on mount
        setCurrentUser(MOCK_USER.email);
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
