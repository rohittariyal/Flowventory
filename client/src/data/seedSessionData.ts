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
  
  // Create sample notes for demo products using actual SKUs
  const sampleNotes = {
    "SKU-001": [
      {
        id: "n_demo1",
        text: "Customer feedback on Bluetooth headphones has been excellent. Audio quality and battery life are standout features. Consider increasing order quantity for next batch due to high demand.",
        author: "Demo User",
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        attachments: [{ name: "customer-reviews-summary.pdf" }]
      },
      {
        id: "n_demo2", 
        text: "Packaging feedback: Some customers mentioned the box could be more premium given the price point. Working with supplier on packaging upgrade.",
        author: "Demo User",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      }
    ],
    "SKU-002": [
      {
        id: "n_demo3",
        text: "New supplier quote received for smartphone cases. 15% cost reduction possible if we switch suppliers, but need to verify quality standards first.",
        author: "Demo User", 
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        attachments: [{ name: "supplier-quote.xlsx" }]
      }
    ],
    "SKU-003": [
      {
        id: "n_demo4",
        text: "Critical stock alert! USB-C cables are selling fast. Need to reorder immediately. Current supplier lead time is 2 weeks.",
        author: "Demo User",
        date: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        attachments: [{ name: "stock-alert.pdf" }]
      }
    ]
  };
  
  localStorage.setItem(notesKey, JSON.stringify(sampleNotes));
  console.log("Seeded product notes demo data");
}