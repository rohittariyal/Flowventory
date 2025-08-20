// Seed session data for mock user authentication
export function initializeSessionData() {
  const sessionKey = "flowventory:session";
  
  // Check if session already exists
  const existingSession = localStorage.getItem(sessionKey);
  if (existingSession) {
    return; // Session already exists, don't overwrite
  }
  
  // Create mock session
  const sessionData = {
    currentUserName: "Demo User",
    userId: "demo-user-1",
    role: "owner"
  };
  
  localStorage.setItem(sessionKey, JSON.stringify(sessionData));
  console.log("Seeded session demo data");
}

// Initialize product notes with sample data if empty
export function initializeProductNotesData() {
  const notesKey = "flowventory:productNotes";
  
  // Check if notes already exist
  const existingNotes = localStorage.getItem(notesKey);
  if (existingNotes) {
    return; // Notes already exist, don't overwrite
  }
  
  // Create sample notes for demo products
  const sampleNotes = {
    "inv-001": [
      {
        id: "n_demo1",
        text: "Product quality excellent. Consider increasing order quantity for next batch.",
        author: "Demo User",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        attachments: [{ name: "quality-report.pdf" }]
      },
      {
        id: "n_demo2", 
        text: "Customer feedback: packaging could be improved. Working with supplier on this.",
        author: "Demo User",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      }
    ],
    "inv-002": [
      {
        id: "n_demo3",
        text: "New supplier quote received. 15% cost reduction possible if we switch.",
        author: "Demo User", 
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        attachments: [{ name: "supplier-quote.xlsx" }]
      }
    ]
  };
  
  localStorage.setItem(notesKey, JSON.stringify(sampleNotes));
  console.log("Seeded product notes demo data");
}