import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LocalityInsight from './models/LocalityInsight.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getrighthome";

const seedData = [
  {
    locality: "Andheri East",
    city: "Mumbai",
    coverImage: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    transactionType: "all",
    pros: ["Excellent metro connectivity", "Proximity to commercial hubs like MIDC and SEEPZ", "High rental demand from working professionals"],
    cons: ["Heavy traffic during peak hours", "Air pollution levels are relatively high", "High cost of living"],
    upcomingDevelopments: [
        { title: "New Metro Line Extension", badge: "Expected 2027" },
        { title: "Gokhale Bridge Reopening", badge: "Major Relief" }
    ],
    landmarks: [
        { name: "Chhatrapati Shivaji Maharaj International Airport", distance: "4 km", type: "Airport" },
        { name: "Andheri Metro Station", distance: "1.5 km", type: "Metro" },
        { name: "SevenHills Hospital", distance: "3 km", type: "Hospital" }
    ],
    residentialZones: ["Marol", "JB Nagar", "Chakala"]
  },
  {
    locality: "Koramangala",
    city: "Bengaluru",
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    transactionType: "all",
    pros: ["Vibrant startup ecosystem", "Excellent cafes, restaurants, and nightlife", "Tree-lined avenues in older blocks"],
    cons: ["Water logging during heavy monsoons", "Traffic bottlenecks on 100ft road", "Expensive property rates"],
    upcomingDevelopments: [
        { title: "Ejipura Flyover Completion", badge: "Infrastructure" },
        { title: "Smart City Road Upgrades", badge: "Civic Work" }
    ],
    landmarks: [
        { name: "Oasis Centre Mall", distance: "2 km", type: "Mall" },
        { name: "St. John's Hospital", distance: "1.5 km", type: "Hospital" },
        { name: "Forum Mall", distance: "2.5 km", type: "Mall" }
    ],
    residentialZones: ["Block 3", "Block 4", "Block 6"]
  },
  {
    locality: "Gachibowli",
    city: "Hyderabad",
    coverImage: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    transactionType: "all",
    pros: ["Hub of IT companies and MNCs", "Wide roads and planned infrastructure", "Proximity to top international schools"],
    cons: ["Limited public transport options inside internal roads", "High dependency on personal vehicles", "Lack of street food culture"],
    upcomingDevelopments: [
        { title: "Airport Express Metro", badge: "Connectivity" },
        { title: "New IT Park Phase 3", badge: "Commercial" }
    ],
    landmarks: [
        { name: "AIG Hospitals", distance: "3 km", type: "Hospital" },
        { name: "IKEA", distance: "5 km", type: "Mall" },
        { name: "Raidurg Metro Station", distance: "4 km", type: "Metro" }
    ],
    residentialZones: ["Financial District", "Nanakramguda", "Kokapet"]
  },
  {
    locality: "Vasant Kunj",
    city: "New Delhi",
    coverImage: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    transactionType: "all",
    pros: ["Lots of greenery and open spaces", "Proximity to the airport", "Excellent high-end malls (DLF Promenade, Emporio)"],
    cons: ["No direct metro station within the sector", "High property prices", "Water supply issues in summer"],
    upcomingDevelopments: [
        { title: "Mahipalpur Underpass Revamp", badge: "Infrastructure" },
        { title: "Aerocity Phase 2", badge: "Commercial Expansion" }
    ],
    landmarks: [
        { name: "DLF Promenade", distance: "2 km", type: "Mall" },
        { name: "Fortis Flt. Lt. Rajan Dhall Hospital", distance: "1.5 km", type: "Hospital" },
        { name: "Chattarpur Metro Station", distance: "4 km", type: "Metro" }
    ],
    residentialZones: ["Sector A", "Sector B", "Sector C", "Sector D"]
  },
  {
    locality: "Salt Lake City (Bidhannagar)",
    city: "Kolkata",
    coverImage: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
    transactionType: "all",
    pros: ["Well-planned grid blocks and parks", "Peaceful and highly secure neighborhood", "Excellent schools and hospitals"],
    cons: ["Expensive compared to other parts of Kolkata", "Limited nightlife", "Older buildings require maintenance"],
    upcomingDevelopments: [
        { title: "East-West Metro Extension", badge: "Transit" },
        { title: "Sector V IT Hub Expansion", badge: "Commercial" }
    ],
    landmarks: [
        { name: "City Centre Mall", distance: "1.5 km", type: "Mall" },
        { name: "AMRI Hospital", distance: "2 km", type: "Hospital" },
        { name: "Karunamoyee Bus Terminal", distance: "1 km", type: "Transit" }
    ],
    residentialZones: ["Sector I", "Sector II", "Sector III"]
  }
];

const seedInsights = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        // Clear existing insights
        await LocalityInsight.deleteMany({});
        console.log("Cleared existing Locality Insights");

        // Insert new
        await LocalityInsight.insertMany(seedData);
        console.log("Successfully seeded 5 Locality Insights");

        process.exit(0);
    } catch (error) {
        console.error("Error seeding data:", error);
        process.exit(1);
    }
};

seedInsights();
