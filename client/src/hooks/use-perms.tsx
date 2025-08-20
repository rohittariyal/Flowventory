import { useState, useEffect, createContext, useContext } from "react";

interface Permissions {
  inventory: boolean;
  pos: boolean;
  suppliers: boolean;
  customers: boolean;
  returns: boolean;
  settings: boolean;
  analytics: boolean;
  reconciliation: boolean;
  users: boolean;
}

interface Role {
  id: string;
  name: string;
  perms: Permissions;
}

interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
}

interface Session {
  currentUserId: string;
}

const ROLES_KEY = "flowventory:roles";
const USERS_KEY = "flowventory:users";
const SESSION_KEY = "flowventory:session";

// Default data
const DEFAULT_ROLES: Role[] = [
  {
    id: "owner",
    name: "Owner",
    perms: {
      inventory: true,
      pos: true,
      suppliers: true,
      customers: true,
      returns: true,
      settings: true,
      analytics: true,
      reconciliation: true,
      users: true
    }
  },
  {
    id: "manager",
    name: "Manager", 
    perms: {
      inventory: true,
      pos: true,
      suppliers: true,
      customers: true,
      returns: true,
      settings: false,
      analytics: true,
      reconciliation: true,
      users: false
    }
  },
  {
    id: "staff",
    name: "Staff",
    perms: {
      inventory: true,
      pos: false,
      suppliers: false,
      customers: true,
      returns: true,
      settings: false,
      analytics: false,
      reconciliation: false,
      users: false
    }
  }
];

const DEFAULT_USERS: User[] = [
  {
    id: "u1",
    name: "Demo Owner",
    email: "owner@demo",
    roleId: "owner"
  }
];

const DEFAULT_SESSION: Session = {
  currentUserId: "u1"
};

interface PermissionsContextType {
  permissions: Permissions | null;
  currentUser: User | null;
  roles: Role[];
  users: User[];
  session: Session | null;
  updateRoles: (roles: Role[]) => void;
  updateUsers: (users: User[]) => void;
  updateSession: (session: Session) => void;
  hasPermission: (perm: keyof Permissions) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize data from localStorage
  useEffect(() => {
    // Load roles
    const storedRoles = localStorage.getItem(ROLES_KEY);
    if (storedRoles) {
      try {
        setRoles(JSON.parse(storedRoles));
      } catch {
        setRoles(DEFAULT_ROLES);
        localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
      }
    } else {
      setRoles(DEFAULT_ROLES);
      localStorage.setItem(ROLES_KEY, JSON.stringify(DEFAULT_ROLES));
    }

    // Load users
    const storedUsers = localStorage.getItem(USERS_KEY);
    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch {
        setUsers(DEFAULT_USERS);
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
      }
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    }

    // Load session
    const storedSession = localStorage.getItem(SESSION_KEY);
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch {
        setSession(DEFAULT_SESSION);
        localStorage.setItem(SESSION_KEY, JSON.stringify(DEFAULT_SESSION));
      }
    } else {
      setSession(DEFAULT_SESSION);
      localStorage.setItem(SESSION_KEY, JSON.stringify(DEFAULT_SESSION));
    }
  }, []);

  // Update permissions when roles, users, or session changes
  useEffect(() => {
    if (roles.length > 0 && users.length > 0 && session) {
      const user = users.find(u => u.id === session.currentUserId);
      if (user) {
        const role = roles.find(r => r.id === user.roleId);
        if (role) {
          setPermissions(role.perms);
          setCurrentUser(user);
        }
      }
    }
  }, [roles, users, session]);

  const updateRoles = (newRoles: Role[]) => {
    setRoles(newRoles);
    localStorage.setItem(ROLES_KEY, JSON.stringify(newRoles));
  };

  const updateUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
  };

  const updateSession = (newSession: Session) => {
    setSession(newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
  };

  const hasPermission = (perm: keyof Permissions): boolean => {
    return permissions?.[perm] ?? false;
  };

  return (
    <PermissionsContext.Provider value={{
      permissions,
      currentUser,
      roles,
      users,
      session,
      updateRoles,
      updateUsers,
      updateSession,
      hasPermission
    }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePerms() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePerms must be used within a PermissionsProvider');
  }
  return context;
}

export type { Permissions, Role, User, Session };