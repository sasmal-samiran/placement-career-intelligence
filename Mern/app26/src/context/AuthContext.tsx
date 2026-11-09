import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type User = { id?: string; name: string; email: string; studentId?: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('careerPilotUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('careerPilotToken'));

  useEffect(() => {
    if (user) localStorage.setItem('careerPilotUser', JSON.stringify(user));
    else localStorage.removeItem('careerPilotUser');
    if (token) localStorage.setItem('careerPilotToken', token);
    else localStorage.removeItem('careerPilotToken');
  }, [user, token]);

  const login = (nextUser: User, nextToken = 'demo-token') => {
    setUser(nextUser);
    setToken(nextToken);
    localStorage.setItem('careerPilotUser', JSON.stringify(nextUser));
    localStorage.setItem('careerPilotToken', nextToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('careerPilotUser');
    localStorage.removeItem('careerPilotToken');
  };

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}