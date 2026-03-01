// ── Types ─────────────────────────────────────────────────────────────────────

export interface Destination {
  placeId: string;
  main: string;
  secondary: string;
  emoji: string;
}

export interface Place {
  name: string;
  type: string;
  time: string;
  duration: string;
  distance: string;
  safety: number;
  emoji: string;
  desc: string;
  rating: number;
  address: string;
  open: string;
}

export interface Pref {
  id: string;
  label: string;
  emoji: string;
}

// ── Destinations ──────────────────────────────────────────────────────────────

export const DESTINATIONS: Destination[] = [
  { placeId: "1",  main: "Mumbai",    secondary: "Maharashtra, India",       emoji: "🏙️" },
  { placeId: "2",  main: "Goa",       secondary: "India",                    emoji: "🏖️" },
  { placeId: "3",  main: "Jaipur",    secondary: "Rajasthan, India",         emoji: "🏯" },
  { placeId: "4",  main: "Delhi",     secondary: "New Delhi, India",         emoji: "🕌" },
  { placeId: "5",  main: "Bangalore", secondary: "Karnataka, India",         emoji: "💻" },
  { placeId: "6",  main: "Udaipur",   secondary: "Rajasthan, India",         emoji: "🛶" },
  { placeId: "7",  main: "Varanasi",  secondary: "Uttar Pradesh, India",     emoji: "🪔" },
  { placeId: "8",  main: "Manali",    secondary: "Himachal Pradesh, India",  emoji: "🏔️" },
  { placeId: "9",  main: "Kerala",    secondary: "India",                    emoji: "🌴" },
  { placeId: "10", main: "Rishikesh", secondary: "Uttarakhand, India",       emoji: "🧘" },
  { placeId: "11", main: "Tokyo",     secondary: "Japan",                    emoji: "🗼" },
  { placeId: "12", main: "Paris",     secondary: "France",                   emoji: "🗺️" },
  { placeId: "13", main: "New York",  secondary: "USA",                      emoji: "🗽" },
  { placeId: "14", main: "Bali",      secondary: "Indonesia",                emoji: "🌺" },
  { placeId: "15", main: "Dubai",     secondary: "UAE",                      emoji: "🏙️" },
  { placeId: "16", main: "Singapore", secondary: "Singapore",                emoji: "🦁" },
  { placeId: "17", main: "Bangkok",   secondary: "Thailand",                 emoji: "🐘" },
  { placeId: "18", main: "Rome",      secondary: "Italy",                    emoji: "🏛️" },
  { placeId: "19", main: "Barcelona", secondary: "Spain",                    emoji: "⛪" },
  { placeId: "20", main: "Sydney",    secondary: "Australia",                emoji: "🦘" },
  { placeId: "21", main: "London",    secondary: "United Kingdom",           emoji: "🎡" },
  { placeId: "22", main: "Istanbul",  secondary: "Turkey",                   emoji: "🕍" },
  { placeId: "23", main: "Amsterdam", secondary: "Netherlands",              emoji: "🚲" },
  { placeId: "24", main: "Hyderabad", secondary: "Telangana, India",         emoji: "🍖" },
  { placeId: "25", main: "Chennai",   secondary: "Tamil Nadu, India",        emoji: "🌊" },
];

// ── Place pool ────────────────────────────────────────────────────────────────

export const PLACE_POOL: Record<string, Place[]> = {
  nature: [
    { name: "Sanjay Gandhi National Park", type: "Nature Reserve", time: "9:00 AM",  duration: "2h",    distance: "12 km", safety: 88, emoji: "🌿", desc: "A vast protected forest with diverse flora and fauna in the heart of the city.", rating: 4.5, address: "Borivali East",      open: "Opens 7:30 AM" },
    { name: "Elephanta Caves",             type: "Heritage Site",  time: "12:00 PM", duration: "2.5h",  distance: "9 km",  safety: 82, emoji: "🏛️", desc: "Ancient cave temples dedicated to Lord Shiva, a UNESCO World Heritage Site.",   rating: 4.3, address: "Elephanta Island",  open: "Opens 9:00 AM" },
    { name: "Hanging Gardens",             type: "Park",           time: "4:00 PM",  duration: "1h",    distance: "5 km",  safety: 91, emoji: "🌸", desc: "Beautiful terraced gardens offering stunning views of the city.",               rating: 4.1, address: "Malabar Hill",      open: "Opens 5:00 AM" },
  ],
  foodie: [
    { name: "Leopold Cafe",       type: "Restaurant",  time: "8:00 AM",  duration: "1h",   distance: "3 km",  safety: 85, emoji: "🍽️", desc: "Iconic Colaba cafe since 1871, famous for multicuisine menu and heritage ambiance.", rating: 4.2, address: "Colaba Causeway", open: "Opens 7:30 AM" },
    { name: "Khau Galli, Dadar",  type: "Street Food", time: "7:00 PM",  duration: "1.5h", distance: "8 km",  safety: 78, emoji: "🥘", desc: "Famous street food lane with authentic local snacks, vada pav and pav bhaji.",       rating: 4.6, address: "Dadar West",       open: "Open till 11 PM" },
    { name: "Trishna Restaurant", type: "Seafood",     time: "1:00 PM",  duration: "1.5h", distance: "4 km",  safety: 87, emoji: "🦞", desc: "Award-winning seafood restaurant known for butter garlic crab since 1980.",           rating: 4.5, address: "Fort Area",         open: "Opens 12:00 PM" },
  ],
  museum: [
    { name: "Chhatrapati Shivaji Museum", type: "Museum", time: "10:00 AM", duration: "2h",   distance: "4 km", safety: 92, emoji: "🏛️", desc: "Premier museum with 50,000+ artifacts including ancient sculptures and decorative arts.", rating: 4.4, address: "Fort, Mumbai", open: "Opens 10:15 AM" },
    { name: "Dr. Bhau Daji Lad Museum",   type: "Museum", time: "2:00 PM",  duration: "1.5h", distance: "7 km", safety: 89, emoji: "🎨", desc: "Mumbai's oldest museum showcasing the city's cultural and industrial history.",          rating: 4.2, address: "Byculla Zoo",  open: "Opens 10:00 AM" },
  ],
  history: [
    { name: "Gateway of India",  type: "Monument", time: "9:00 AM",  duration: "1h",     distance: "5 km",  safety: 80, emoji: "🏯", desc: "Iconic arch-monument built in 1924 to commemorate the visit of King George V.",   rating: 4.5, address: "Apollo Bunder, Colaba", open: "Open 24 hours" },
    { name: "Dhobi Ghat",        type: "Heritage", time: "7:00 AM",  duration: "45 min", distance: "6 km",  safety: 75, emoji: "👕", desc: "The world's largest outdoor laundry — a truly unique Mumbai landmark.",            rating: 4.1, address: "Mahalaxmi, Mumbai",     open: "Best at sunrise" },
    { name: "Kanheri Caves",     type: "Heritage", time: "10:00 AM", duration: "3h",     distance: "35 km", safety: 84, emoji: "🪨", desc: "Ancient Buddhist caves dating back to 1st century BCE inside a national park.",   rating: 4.4, address: "Sanjay Gandhi NP",      open: "Opens 7:30 AM" },
  ],
  popular: [
    { name: "Marine Drive",          type: "Promenade", time: "6:00 AM",  duration: "1.5h",  distance: "2 km",  safety: 90, emoji: "🌊", desc: "The iconic 3.6 km boulevard along the coast — Mumbai's Queen's Necklace.",         rating: 4.7, address: "Netaji Subhash Chandra Bose Rd", open: "Open 24 hours" },
    { name: "Juhu Beach",            type: "Beach",     time: "5:00 PM",  duration: "2h",    distance: "18 km", safety: 76, emoji: "🏖️", desc: "Popular suburban beach with street food stalls, perfect for golden-hour sunsets.", rating: 4.0, address: "Juhu, Mumbai",                   open: "Open 24 hours" },
    { name: "Bandra-Worli Sea Link", type: "Landmark", time: "8:00 PM",  duration: "30 min", distance: "10 km", safety: 88, emoji: "🌉", desc: "A stunning cable-stayed bridge, especially spectacular when lit up at night.",    rating: 4.6, address: "Bandra West",                    open: "Open 24 hours" },
  ],
  shopping: [
    { name: "Colaba Causeway",      type: "Shopping", time: "11:00 AM", duration: "2h", distance: "5 km",  safety: 82, emoji: "🛍️", desc: "Vibrant market street with antiques, handicrafts, clothes and street food.",  rating: 4.3, address: "Colaba, Mumbai", open: "Opens 10:00 AM" },
    { name: "Linking Road, Bandra", type: "Shopping", time: "3:00 PM",  duration: "2h", distance: "14 km", safety: 84, emoji: "👟", desc: "Famous for budget fashion, footwear and accessories from local boutiques.",    rating: 4.1, address: "Bandra West",    open: "Opens 11:00 AM" },
  ],
};

// ── Preferences ───────────────────────────────────────────────────────────────

export const PREFS: Pref[] = [
  { id: "popular",  label: "Popular",  emoji: "👍" },
  { id: "museum",   label: "Museum",   emoji: "🏛️" },
  { id: "nature",   label: "Nature",   emoji: "🌿" },
  { id: "foodie",   label: "Foodie",   emoji: "🍕" },
  { id: "history",  label: "History",  emoji: "🏺" },
  { id: "shopping", label: "Shopping", emoji: "🛍️" },
];
