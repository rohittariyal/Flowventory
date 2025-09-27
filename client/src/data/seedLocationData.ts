// Location Access Seed Data

import { User, Location, Session } from "@/utils/locationAccess";

const USERS_KEY = "flowventory:users";
const LOCATIONS_KEY = "flowventory:locations";
const SESSION_KEY = "flowventory:session";

// Sample locations
const seedLocations: Location[] = [
  {
    id: "loc-1",
    name: "New York Warehouse",
    regionId: "us-east"
  },
  {
    id: "loc-2", 
    name: "California Distribution Center",
    regionId: "us-west"
  },
  {
    id: "loc-3",
    name: "Texas Fulfillment Hub",
    regionId: "us-central"
  },
  {
    id: "loc-4",
    name: "London Operations",
    regionId: "uk"
  },
  {
    id: "loc-5",
    name: "Singapore Office",
    regionId: "apac"
  }
];

// Sample users with location assignments
const seedUsers: User[] = [
  {
    id: "user-owner-1",
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com", 
    roleId: "owner",
    // Owner - no allowedLocations means access to all
  },
  {
    id: "user-admin-1",
    name: "Michael Chen",
    email: "michael.chen@company.com",
    roleId: "admin",
    // Admin - no allowedLocations means access to all
  },
  {
    id: "user-manager-1", 
    name: "Emily Rodriguez",
    email: "emily.rodriguez@company.com",
    roleId: "manager",
    allowedLocations: ["loc-1", "loc-2"] // US East and West only
  },
  {
    id: "user-manager-2",
    name: "David Kim", 
    email: "david.kim@company.com",
    roleId: "manager",
    allowedLocations: ["loc-4", "loc-5"] // International locations only
  },
  {
    id: "user-staff-1",
    name: "Jessica Williams",
    email: "jessica.williams@company.com", 
    roleId: "staff",
    // Staff - no allowedLocations assigned, should see guard message
  },
  {
    id: "user-staff-2",
    name: "Robert Taylor",
    email: "robert.taylor@company.com",
    roleId: "staff", 
    allowedLocations: ["loc-1"] // Only NY warehouse access
  }
];

// Default session (Owner user)
const seedSession: Session = {
  currentUserId: "user-owner-1"
};

/**
 * Initialize location access seed data
 */
export function initializeLocationAccessData(): void {
  try {
    // Initialize locations if not present
    const existingLocations = localStorage.getItem(LOCATIONS_KEY);
    if (!existingLocations) {
      localStorage.setItem(LOCATIONS_KEY, JSON.stringify(seedLocations));
      console.log('✅ Location access: Initialized locations data');
    }

    // Initialize users if not present 
    const existingUsers = localStorage.getItem(USERS_KEY);
    if (!existingUsers) {
      localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
      console.log('✅ Location access: Initialized users data');
    } else {
      // Update existing users to include location access fields
      const users = JSON.parse(existingUsers);
      const updatedUsers = users.map((user: any) => {
        const seedUser = seedUsers.find(su => su.email === user.email);
        if (seedUser) {
          return { ...user, ...seedUser };
        }
        return { ...user, allowedLocations: undefined };
      });
      
      // Add any new seed users that don't exist
      seedUsers.forEach(seedUser => {
        if (!updatedUsers.find((u: any) => u.email === seedUser.email)) {
          updatedUsers.push(seedUser);
        }
      });
      
      localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
      console.log('✅ Location access: Updated existing users with location data');
    }

    // Initialize session if not present
    const existingSession = localStorage.getItem(SESSION_KEY);
    if (!existingSession) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(seedSession));
      console.log('✅ Location access: Initialized session data');
    }

    console.log('🎯 Location access seed data initialized successfully');
    
  } catch (error) {
    console.error('❌ Error initializing location access data:', error);
  }
}

export { seedLocations, seedUsers, seedSession };