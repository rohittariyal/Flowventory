// Location Access Control Utilities

interface User {
  id: string;
  name?: string;
  email: string;
  role?: string;
  roleId?: string;
  allowedLocations?: string[];
}

interface Location {
  id: string;
  name: string;
  regionId: string;
}

interface UserScope {
  scope: 'all' | 'subset' | 'none';
  locations?: string[];
}

interface Session {
  currentUserId?: string;
}

const USERS_KEY = "flowventory:users";
const SESSION_KEY = "flowventory:session";
const LOCATIONS_KEY = "flowventory:locations";

/**
 * Get current user from session and users data
 */
export function getCurrentUser(): User | null {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || '{}') as Session;
    if (!session.currentUserId) return null;

    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as User[];
    return users.find(user => user.id === session.currentUserId) || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Set current user in session
 */
export function setCurrentUser(userId: string): void {
  try {
    const session: Session = { currentUserId: userId };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Error setting current user:', error);
  }
}

/**
 * Determine user's location scope based on role and allowedLocations
 */
export function getUserScope(user: User): UserScope {
  const userRole = (user.roleId || user.role || '').toLowerCase();
  const isOwnerOrAdmin = ['owner', 'admin'].includes(userRole);
  
  // Owner/Admin with no allowedLocations restriction = all access
  if (isOwnerOrAdmin && (!user.allowedLocations || user.allowedLocations.length === 0)) {
    return { scope: 'all' };
  }
  
  // User has specific locations assigned
  if (user.allowedLocations && user.allowedLocations.length > 0) {
    return { 
      scope: 'subset', 
      locations: user.allowedLocations 
    };
  }
  
  // No locations assigned = no access
  return { scope: 'none' };
}

/**
 * Check if a location is within user's scope
 */
export function inScope(locationId: string, userScope: UserScope): boolean {
  switch (userScope.scope) {
    case 'all':
      return true;
    case 'subset':
      return userScope.locations?.includes(locationId) || false;
    case 'none':
      return false;
    default:
      return false;
  }
}

/**
 * Filter collection by location scope
 */
export function scopeFilter<T extends Record<string, any>>(
  collection: T[], 
  byLocationIdField: keyof T,
  userScope: UserScope
): T[] {
  if (userScope.scope === 'all') {
    return collection;
  }
  
  if (userScope.scope === 'none') {
    return [];
  }
  
  // subset scope
  return collection.filter(item => 
    inScope(item[byLocationIdField] as string, userScope)
  );
}

/**
 * Get all locations
 */
export function getLocations(): Location[] {
  try {
    return JSON.parse(localStorage.getItem(LOCATIONS_KEY) || '[]') as Location[];
  } catch (error) {
    console.error('Error getting locations:', error);
    return [];
  }
}

/**
 * Get locations accessible to current user
 */
export function getUserAccessibleLocations(): Location[] {
  const user = getCurrentUser();
  if (!user) return [];
  
  const userScope = getUserScope(user);
  const allLocations = getLocations();
  
  return scopeFilter(allLocations, 'id', userScope);
}

/**
 * Get users data
 */
export function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') as User[];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

/**
 * Update user's allowed locations
 */
export function updateUserLocations(userId: string, allowedLocations: string[]): void {
  try {
    const users = getUsers();
    const updatedUsers = users.map(user => 
      user.id === userId 
        ? { ...user, allowedLocations }
        : user
    );
    localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
  } catch (error) {
    console.error('Error updating user locations:', error);
  }
}

/**
 * Check if current user can manage other users' location access
 */
export function canManageUserLocations(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return ['owner', 'admin'].includes(user.roleId.toLowerCase());
}

/**
 * Get location name by ID
 */
export function getLocationName(locationId: string): string {
  const locations = getLocations();
  const location = locations.find(loc => loc.id === locationId);
  return location?.name || 'Unknown Location';
}

/**
 * Format location scope for display
 */
export function formatLocationScope(user: User): string {
  const scope = getUserScope(user);
  
  switch (scope.scope) {
    case 'all':
      return 'All locations';
    case 'subset':
      return `${scope.locations?.length || 0} locations`;
    case 'none':
      return 'No locations';
    default:
      return 'Unknown';
  }
}

/**
 * Location access guard component props
 */
export interface LocationGuardProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export { type User, type Location, type UserScope, type Session };