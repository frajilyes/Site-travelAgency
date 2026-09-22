/** Reference data used to populate an empty database. */

export interface SeedCountry {
  code: string;
  name: string;
  continent: string;
  currency: string;
  phone_code: string;
  visa_note: string | null;
}

export const COUNTRIES: SeedCountry[] = [
  { code: 'FR', name: 'France', continent: 'Europe', currency: 'EUR', phone_code: '+33', visa_note: "Espace Schengen — carte d'identité suffisante pour l'UE." },
  { code: 'GB', name: 'Royaume-Uni', continent: 'Europe', currency: 'GBP', phone_code: '+44', visa_note: 'Passeport obligatoire. Autorisation ETA requise.' },
  { code: 'DE', name: 'Allemagne', continent: 'Europe', currency: 'EUR', phone_code: '+49', visa_note: 'Espace Schengen.' },
  { code: 'ES', name: 'Espagne', continent: 'Europe', currency: 'EUR', phone_code: '+34', visa_note: 'Espace Schengen.' },
  { code: 'IT', name: 'Italie', continent: 'Europe', currency: 'EUR', phone_code: '+39', visa_note: 'Espace Schengen.' },
  { code: 'NL', name: 'Pays-Bas', continent: 'Europe', currency: 'EUR', phone_code: '+31', visa_note: 'Espace Schengen.' },
  { code: 'CH', name: 'Suisse', continent: 'Europe', currency: 'CHF', phone_code: '+41', visa_note: 'Espace Schengen, hors UE — contrôles douaniers.' },
  { code: 'PT', name: 'Portugal', continent: 'Europe', currency: 'EUR', phone_code: '+351', visa_note: 'Espace Schengen.' },
  { code: 'TR', name: 'Turquie', continent: 'Europe', currency: 'TRY', phone_code: '+90', visa_note: 'Passeport valable 150 jours après la date d’entrée.' },
  { code: 'RU', name: 'Russie', continent: 'Europe', currency: 'RUB', phone_code: '+7', visa_note: 'Visa obligatoire avec invitation.' },
  { code: 'US', name: 'États-Unis', continent: 'Amérique du Nord', currency: 'USD', phone_code: '+1', visa_note: 'Autorisation ESTA obligatoire avant le départ.' },
  { code: 'CA', name: 'Canada', continent: 'Amérique du Nord', currency: 'CAD', phone_code: '+1', visa_note: 'Autorisation AVE obligatoire.' },
  { code: 'MX', name: 'Mexique', continent: 'Amérique du Nord', currency: 'MXN', phone_code: '+52', visa_note: 'Séjour touristique de 180 jours sans visa.' },
  { code: 'BR', name: 'Brésil', continent: 'Amérique du Sud', currency: 'BRL', phone_code: '+55', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'AR', name: 'Argentine', continent: 'Amérique du Sud', currency: 'ARS', phone_code: '+54', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'CL', name: 'Chili', continent: 'Amérique du Sud', currency: 'CLP', phone_code: '+56', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'PE', name: 'Pérou', continent: 'Amérique du Sud', currency: 'PEN', phone_code: '+51', visa_note: 'Séjour de 183 jours sans visa.' },
  { code: 'MA', name: 'Maroc', continent: 'Afrique', currency: 'MAD', phone_code: '+212', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'TN', name: 'Tunisie', continent: 'Afrique', currency: 'TND', phone_code: '+216', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'EG', name: 'Égypte', continent: 'Afrique', currency: 'EGP', phone_code: '+20', visa_note: 'Visa à l’arrivée ou e-visa.' },
  { code: 'ZA', name: 'Afrique du Sud', continent: 'Afrique', currency: 'ZAR', phone_code: '+27', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'SN', name: 'Sénégal', continent: 'Afrique', currency: 'XOF', phone_code: '+221', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'KE', name: 'Kenya', continent: 'Afrique', currency: 'KES', phone_code: '+254', visa_note: 'Autorisation électronique de voyage obligatoire.' },
  { code: 'NG', name: 'Nigeria', continent: 'Afrique', currency: 'NGN', phone_code: '+234', visa_note: 'Visa obligatoire avant le départ.' },
  { code: 'AE', name: 'Émirats arabes unis', continent: 'Asie', currency: 'AED', phone_code: '+971', visa_note: 'Visa de 90 jours délivré à l’arrivée.' },
  { code: 'QA', name: 'Qatar', continent: 'Asie', currency: 'QAR', phone_code: '+974', visa_note: 'Exemption de visa de 90 jours.' },
  { code: 'SA', name: 'Arabie saoudite', continent: 'Asie', currency: 'SAR', phone_code: '+966', visa_note: 'E-visa touristique obligatoire.' },
  { code: 'IN', name: 'Inde', continent: 'Asie', currency: 'INR', phone_code: '+91', visa_note: 'E-visa obligatoire avant le départ.' },
  { code: 'CN', name: 'Chine', continent: 'Asie', currency: 'CNY', phone_code: '+86', visa_note: 'Visa obligatoire, exemptions selon la durée du séjour.' },
  { code: 'JP', name: 'Japon', continent: 'Asie', currency: 'JPY', phone_code: '+81', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'KR', name: 'Corée du Sud', continent: 'Asie', currency: 'KRW', phone_code: '+82', visa_note: 'Autorisation K-ETA requise.' },
  { code: 'SG', name: 'Singapour', continent: 'Asie', currency: 'SGD', phone_code: '+65', visa_note: 'Séjour de 90 jours sans visa.' },
  { code: 'TH', name: 'Thaïlande', continent: 'Asie', currency: 'THB', phone_code: '+66', visa_note: 'Séjour de 60 jours sans visa.' },
  { code: 'AU', name: 'Australie', continent: 'Océanie', currency: 'AUD', phone_code: '+61', visa_note: 'Autorisation eVisitor obligatoire.' },
  { code: 'NZ', name: 'Nouvelle-Zélande', continent: 'Océanie', currency: 'NZD', phone_code: '+64', visa_note: 'Autorisation NZeTA obligatoire.' },
];

export interface SeedAirport {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
}

export const AIRPORTS: SeedAirport[] = [
  { iata: 'CDG', icao: 'LFPG', name: 'Paris-Charles de Gaulle', city: 'Paris', country: 'FR', timezone: 'Europe/Paris', latitude: 49.0097, longitude: 2.5479 },
  { iata: 'ORY', icao: 'LFPO', name: 'Paris-Orly', city: 'Paris', country: 'FR', timezone: 'Europe/Paris', latitude: 48.7233, longitude: 2.3794 },
  { iata: 'NCE', icao: 'LFMN', name: "Nice Côte d'Azur", city: 'Nice', country: 'FR', timezone: 'Europe/Paris', latitude: 43.6584, longitude: 7.2159 },
  { iata: 'LYS', icao: 'LFLL', name: 'Lyon-Saint-Exupéry', city: 'Lyon', country: 'FR', timezone: 'Europe/Paris', latitude: 45.7256, longitude: 5.0811 },
  { iata: 'LHR', icao: 'EGLL', name: 'London Heathrow', city: 'Londres', country: 'GB', timezone: 'Europe/London', latitude: 51.47, longitude: -0.4543 },
  { iata: 'MAN', icao: 'EGCC', name: 'Manchester', city: 'Manchester', country: 'GB', timezone: 'Europe/London', latitude: 53.3537, longitude: -2.275 },
  { iata: 'FRA', icao: 'EDDF', name: 'Francfort-sur-le-Main', city: 'Francfort', country: 'DE', timezone: 'Europe/Berlin', latitude: 50.0379, longitude: 8.5622 },
  { iata: 'MUC', icao: 'EDDM', name: 'Munich Franz-Josef-Strauss', city: 'Munich', country: 'DE', timezone: 'Europe/Berlin', latitude: 48.3537, longitude: 11.775 },
  { iata: 'MAD', icao: 'LEMD', name: 'Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'ES', timezone: 'Europe/Madrid', latitude: 40.4719, longitude: -3.5626 },
  { iata: 'BCN', icao: 'LEBL', name: 'Barcelone-El Prat', city: 'Barcelone', country: 'ES', timezone: 'Europe/Madrid', latitude: 41.2974, longitude: 2.0833 },
  { iata: 'FCO', icao: 'LIRF', name: 'Rome-Fiumicino', city: 'Rome', country: 'IT', timezone: 'Europe/Rome', latitude: 41.8003, longitude: 12.2389 },
  { iata: 'MXP', icao: 'LIMC', name: 'Milan-Malpensa', city: 'Milan', country: 'IT', timezone: 'Europe/Rome', latitude: 45.6306, longitude: 8.7281 },
  { iata: 'AMS', icao: 'EHAM', name: 'Amsterdam-Schiphol', city: 'Amsterdam', country: 'NL', timezone: 'Europe/Amsterdam', latitude: 52.3105, longitude: 4.7683 },
  { iata: 'ZRH', icao: 'LSZH', name: 'Zurich Kloten', city: 'Zurich', country: 'CH', timezone: 'Europe/Zurich', latitude: 47.4647, longitude: 8.5492 },
  { iata: 'LIS', icao: 'LPPT', name: 'Lisbonne-Humberto Delgado', city: 'Lisbonne', country: 'PT', timezone: 'Europe/Lisbon', latitude: 38.7742, longitude: -9.1342 },
  { iata: 'IST', icao: 'LTFM', name: 'Istanbul', city: 'Istanbul', country: 'TR', timezone: 'Europe/Istanbul', latitude: 41.2753, longitude: 28.7519 },
  { iata: 'SVO', icao: 'UUEE', name: 'Moscou-Cheremetievo', city: 'Moscou', country: 'RU', timezone: 'Europe/Moscow', latitude: 55.9726, longitude: 37.4146 },
  { iata: 'JFK', icao: 'KJFK', name: 'New York John F. Kennedy', city: 'New York', country: 'US', timezone: 'America/New_York', latitude: 40.6413, longitude: -73.7781 },
  { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'US', timezone: 'America/Los_Angeles', latitude: 33.9416, longitude: -118.4085 },
  { iata: 'ORD', icao: 'KORD', name: "Chicago O'Hare", city: 'Chicago', country: 'US', timezone: 'America/Chicago', latitude: 41.9742, longitude: -87.9073 },
  { iata: 'MIA', icao: 'KMIA', name: 'Miami International', city: 'Miami', country: 'US', timezone: 'America/New_York', latitude: 25.7959, longitude: -80.287 },
  { iata: 'SFO', icao: 'KSFO', name: 'San Francisco International', city: 'San Francisco', country: 'US', timezone: 'America/Los_Angeles', latitude: 37.6213, longitude: -122.379 },
  { iata: 'YYZ', icao: 'CYYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'CA', timezone: 'America/Toronto', latitude: 43.6777, longitude: -79.6248 },
  { iata: 'YUL', icao: 'CYUL', name: 'Montréal-Trudeau', city: 'Montréal', country: 'CA', timezone: 'America/Toronto', latitude: 45.4706, longitude: -73.7408 },
  { iata: 'MEX', icao: 'MMMX', name: 'Mexico Benito Juárez', city: 'Mexico', country: 'MX', timezone: 'America/Mexico_City', latitude: 19.4363, longitude: -99.0721 },
  { iata: 'GRU', icao: 'SBGR', name: 'São Paulo-Guarulhos', city: 'São Paulo', country: 'BR', timezone: 'America/Sao_Paulo', latitude: -23.4356, longitude: -46.4731 },
  { iata: 'GIG', icao: 'SBGL', name: 'Rio de Janeiro-Galeão', city: 'Rio de Janeiro', country: 'BR', timezone: 'America/Sao_Paulo', latitude: -22.81, longitude: -43.2506 },
  { iata: 'EZE', icao: 'SAEZ', name: 'Buenos Aires-Ezeiza', city: 'Buenos Aires', country: 'AR', timezone: 'America/Argentina/Buenos_Aires', latitude: -34.8222, longitude: -58.5358 },
  { iata: 'SCL', icao: 'SCEL', name: 'Santiago Arturo Merino Benítez', city: 'Santiago', country: 'CL', timezone: 'America/Santiago', latitude: -33.393, longitude: -70.7858 },
  { iata: 'LIM', icao: 'SPJC', name: 'Lima Jorge Chávez', city: 'Lima', country: 'PE', timezone: 'America/Lima', latitude: -12.0219, longitude: -77.1143 },
  { iata: 'CMN', icao: 'GMMN', name: 'Casablanca Mohammed V', city: 'Casablanca', country: 'MA', timezone: 'Africa/Casablanca', latitude: 33.3675, longitude: -7.5899 },
  { iata: 'RAK', icao: 'GMMX', name: 'Marrakech-Ménara', city: 'Marrakech', country: 'MA', timezone: 'Africa/Casablanca', latitude: 31.6069, longitude: -8.0363 },
  { iata: 'TUN', icao: 'DTTA', name: 'Tunis-Carthage', city: 'Tunis', country: 'TN', timezone: 'Africa/Tunis', latitude: 36.851, longitude: 10.2272 },
  { iata: 'CAI', icao: 'HECA', name: 'Le Caire International', city: 'Le Caire', country: 'EG', timezone: 'Africa/Cairo', latitude: 30.1219, longitude: 31.4056 },
  { iata: 'JNB', icao: 'FAOR', name: 'Johannesburg O. R. Tambo', city: 'Johannesburg', country: 'ZA', timezone: 'Africa/Johannesburg', latitude: -26.1392, longitude: 28.246 },
  { iata: 'CPT', icao: 'FACT', name: 'Le Cap International', city: 'Le Cap', country: 'ZA', timezone: 'Africa/Johannesburg', latitude: -33.9649, longitude: 18.6017 },
  { iata: 'DSS', icao: 'GOBD', name: 'Dakar Blaise Diagne', city: 'Dakar', country: 'SN', timezone: 'Africa/Dakar', latitude: 14.67, longitude: -17.0733 },
  { iata: 'NBO', icao: 'HKJK', name: 'Nairobi Jomo Kenyatta', city: 'Nairobi', country: 'KE', timezone: 'Africa/Nairobi', latitude: -1.3192, longitude: 36.9278 },
  { iata: 'LOS', icao: 'DNMM', name: 'Lagos Murtala Muhammed', city: 'Lagos', country: 'NG', timezone: 'Africa/Lagos', latitude: 6.5774, longitude: 3.3212 },
  { iata: 'DXB', icao: 'OMDB', name: 'Dubaï International', city: 'Dubaï', country: 'AE', timezone: 'Asia/Dubai', latitude: 25.2532, longitude: 55.3657 },
  { iata: 'AUH', icao: 'OMAA', name: 'Abu Dhabi Zayed', city: 'Abu Dhabi', country: 'AE', timezone: 'Asia/Dubai', latitude: 24.433, longitude: 54.6511 },
  { iata: 'DOH', icao: 'OTHH', name: 'Doha Hamad', city: 'Doha', country: 'QA', timezone: 'Asia/Qatar', latitude: 25.2731, longitude: 51.6081 },
  { iata: 'JED', icao: 'OEJN', name: 'Djeddah Roi Abdulaziz', city: 'Djeddah', country: 'SA', timezone: 'Asia/Riyadh', latitude: 21.6796, longitude: 39.1565 },
  { iata: 'DEL', icao: 'VIDP', name: 'Delhi Indira Gandhi', city: 'Delhi', country: 'IN', timezone: 'Asia/Kolkata', latitude: 28.5562, longitude: 77.1 },
  { iata: 'BOM', icao: 'VABB', name: 'Mumbai Chhatrapati Shivaji', city: 'Mumbai', country: 'IN', timezone: 'Asia/Kolkata', latitude: 19.0896, longitude: 72.8656 },
  { iata: 'PEK', icao: 'ZBAA', name: 'Pékin Capital', city: 'Pékin', country: 'CN', timezone: 'Asia/Shanghai', latitude: 40.0799, longitude: 116.6031 },
  { iata: 'PVG', icao: 'ZSPD', name: 'Shanghai Pudong', city: 'Shanghai', country: 'CN', timezone: 'Asia/Shanghai', latitude: 31.1443, longitude: 121.8083 },
  { iata: 'NRT', icao: 'RJAA', name: 'Tokyo Narita', city: 'Tokyo', country: 'JP', timezone: 'Asia/Tokyo', latitude: 35.772, longitude: 140.3929 },
  { iata: 'HND', icao: 'RJTT', name: 'Tokyo Haneda', city: 'Tokyo', country: 'JP', timezone: 'Asia/Tokyo', latitude: 35.5494, longitude: 139.7798 },
  { iata: 'ICN', icao: 'RKSI', name: 'Séoul Incheon', city: 'Séoul', country: 'KR', timezone: 'Asia/Seoul', latitude: 37.4602, longitude: 126.4407 },
  { iata: 'SIN', icao: 'WSSS', name: 'Singapour Changi', city: 'Singapour', country: 'SG', timezone: 'Asia/Singapore', latitude: 1.3644, longitude: 103.9915 },
  { iata: 'BKK', icao: 'VTBS', name: 'Bangkok Suvarnabhumi', city: 'Bangkok', country: 'TH', timezone: 'Asia/Bangkok', latitude: 13.69, longitude: 100.7501 },
  { iata: 'SYD', icao: 'YSSY', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'AU', timezone: 'Australia/Sydney', latitude: -33.9399, longitude: 151.1753 },
  { iata: 'MEL', icao: 'YMML', name: 'Melbourne Tullamarine', city: 'Melbourne', country: 'AU', timezone: 'Australia/Melbourne', latitude: -37.669, longitude: 144.841 },
  { iata: 'AKL', icao: 'NZAA', name: 'Auckland International', city: 'Auckland', country: 'NZ', timezone: 'Pacific/Auckland', latitude: -37.0082, longitude: 174.785 },
];

export interface SeedAirline {
  iata: string;
  name: string;
  country: string;
  alliance: string | null;
}

export const AIRLINES: SeedAirline[] = [
  { iata: 'AF', name: 'Air France', country: 'FR', alliance: 'SkyTeam' },
  { iata: 'BA', name: 'British Airways', country: 'GB', alliance: 'Oneworld' },
  { iata: 'LH', name: 'Lufthansa', country: 'DE', alliance: 'Star Alliance' },
  { iata: 'IB', name: 'Iberia', country: 'ES', alliance: 'Oneworld' },
  { iata: 'AZ', name: 'ITA Airways', country: 'IT', alliance: 'SkyTeam' },
  { iata: 'KL', name: 'KLM Royal Dutch Airlines', country: 'NL', alliance: 'SkyTeam' },
  { iata: 'LX', name: 'Swiss International Air Lines', country: 'CH', alliance: 'Star Alliance' },
  { iata: 'TP', name: 'TAP Air Portugal', country: 'PT', alliance: 'Star Alliance' },
  { iata: 'TK', name: 'Turkish Airlines', country: 'TR', alliance: 'Star Alliance' },
  { iata: 'EK', name: 'Emirates', country: 'AE', alliance: null },
  { iata: 'EY', name: 'Etihad Airways', country: 'AE', alliance: null },
  { iata: 'QR', name: 'Qatar Airways', country: 'QA', alliance: 'Oneworld' },
  { iata: 'AA', name: 'American Airlines', country: 'US', alliance: 'Oneworld' },
  { iata: 'DL', name: 'Delta Air Lines', country: 'US', alliance: 'SkyTeam' },
  { iata: 'UA', name: 'United Airlines', country: 'US', alliance: 'Star Alliance' },
  { iata: 'AC', name: 'Air Canada', country: 'CA', alliance: 'Star Alliance' },
  { iata: 'SQ', name: 'Singapore Airlines', country: 'SG', alliance: 'Star Alliance' },
  { iata: 'NH', name: 'All Nippon Airways', country: 'JP', alliance: 'Star Alliance' },
  { iata: 'QF', name: 'Qantas', country: 'AU', alliance: 'Oneworld' },
  { iata: 'SA', name: 'South African Airways', country: 'ZA', alliance: 'Star Alliance' },
  { iata: 'AT', name: 'Royal Air Maroc', country: 'MA', alliance: 'Oneworld' },
  { iata: 'MS', name: 'EgyptAir', country: 'EG', alliance: 'Star Alliance' },
  { iata: 'AI', name: 'Air India', country: 'IN', alliance: 'Star Alliance' },
  { iata: 'CA', name: 'Air China', country: 'CN', alliance: 'Star Alliance' },
  { iata: 'LA', name: 'LATAM Airlines', country: 'CL', alliance: null },
  { iata: 'TU', name: 'Tunisair', country: 'TN', alliance: null },
  { iata: 'KQ', name: 'Kenya Airways', country: 'KE', alliance: 'SkyTeam' },
];

export interface SeedAircraft {
  code: string;
  model: string;
  manufacturer: string;
  capacity_economy: number;
  capacity_business: number;
  capacity_first: number;
  range_km: number;
  cruise_speed_kmh: number;
}

export const AIRCRAFT: SeedAircraft[] = [
  { code: 'E190', model: 'E190-E2', manufacturer: 'Embraer', capacity_economy: 106, capacity_business: 8, capacity_first: 0, range_km: 5280, cruise_speed_kmh: 829 },
  { code: 'A320', model: 'A320neo', manufacturer: 'Airbus', capacity_economy: 150, capacity_business: 12, capacity_first: 0, range_km: 6300, cruise_speed_kmh: 833 },
  { code: 'B737', model: '737 MAX 8', manufacturer: 'Boeing', capacity_economy: 162, capacity_business: 16, capacity_first: 0, range_km: 6570, cruise_speed_kmh: 839 },
  { code: 'A321', model: 'A321neo', manufacturer: 'Airbus', capacity_economy: 180, capacity_business: 20, capacity_first: 0, range_km: 7400, cruise_speed_kmh: 833 },
  { code: 'A330', model: 'A330-300', manufacturer: 'Airbus', capacity_economy: 240, capacity_business: 36, capacity_first: 0, range_km: 11750, cruise_speed_kmh: 871 },
  { code: 'B787', model: '787-9 Dreamliner', manufacturer: 'Boeing', capacity_economy: 236, capacity_business: 48, capacity_first: 0, range_km: 14140, cruise_speed_kmh: 903 },
  { code: 'A350', model: 'A350-900', manufacturer: 'Airbus', capacity_economy: 253, capacity_business: 48, capacity_first: 8, range_km: 15000, cruise_speed_kmh: 903 },
  { code: 'B777', model: '777-300ER', manufacturer: 'Boeing', capacity_economy: 304, capacity_business: 56, capacity_first: 8, range_km: 13650, cruise_speed_kmh: 892 },
  { code: 'B747', model: '747-8 Intercontinental', manufacturer: 'Boeing', capacity_economy: 364, capacity_business: 60, capacity_first: 12, range_km: 14320, cruise_speed_kmh: 917 },
  { code: 'A380', model: 'A380-800', manufacturer: 'Airbus', capacity_economy: 399, capacity_business: 76, capacity_first: 14, range_km: 15200, cruise_speed_kmh: 903 },
];

/** Each operating base and the airports it is connected to (flights run both ways). */
export const NETWORK: { airline: string; hub: string; destinations: string[] }[] = [
  {
    airline: 'AF',
    hub: 'CDG',
    destinations: ['LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'LIS', 'IST', 'MUC', 'NCE', 'LYS', 'JFK', 'LAX', 'ORD', 'MIA', 'SFO', 'YUL', 'YYZ', 'MEX', 'GRU', 'GIG', 'EZE', 'SCL', 'LIM', 'CMN', 'RAK', 'TUN', 'CAI', 'DSS', 'NBO', 'JNB', 'CPT', 'LOS', 'DXB', 'DOH', 'AUH', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'SVO'],
  },
  { airline: 'BA', hub: 'LHR', destinations: ['CDG', 'ORY', 'MAD', 'BCN', 'FCO', 'AMS', 'FRA', 'MUC', 'ZRH', 'LIS', 'MAN', 'IST', 'JFK', 'LAX', 'ORD', 'MIA', 'SFO', 'YYZ', 'GRU', 'EZE', 'CPT', 'JNB', 'NBO', 'LOS', 'DXB', 'DOH', 'DEL', 'BOM', 'HND', 'SIN', 'BKK', 'SYD', 'CAI'] },
  { airline: 'LH', hub: 'FRA', destinations: ['CDG', 'LHR', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'ORD', 'LAX', 'SFO', 'YYZ', 'MEX', 'GRU', 'EZE', 'JNB', 'CAI', 'DXB', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'ICN', 'SIN', 'BKK', 'LOS', 'NBO'] },
  { airline: 'KL', hub: 'AMS', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'LIS', 'ZRH', 'MUC', 'JFK', 'ORD', 'SFO', 'YYZ', 'YUL', 'MEX', 'GRU', 'LIM', 'CMN', 'CAI', 'NBO', 'JNB', 'CPT', 'LOS', 'DXB', 'DEL', 'BOM', 'PVG', 'NRT', 'ICN', 'SIN', 'BKK'] },
  { airline: 'IB', hub: 'MAD', destinations: ['CDG', 'ORY', 'LHR', 'FRA', 'BCN', 'FCO', 'MXP', 'AMS', 'LIS', 'ZRH', 'MUC', 'JFK', 'MIA', 'ORD', 'LAX', 'MEX', 'GRU', 'GIG', 'EZE', 'SCL', 'LIM', 'CMN', 'TUN', 'DSS', 'CAI'] },
  { airline: 'AZ', hub: 'FCO', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'NCE', 'JFK', 'MIA', 'ORD', 'LAX', 'YYZ', 'GRU', 'EZE', 'CAI', 'TUN', 'DXB', 'DOH', 'DEL', 'NRT'] },
  { airline: 'LX', hub: 'ZRH', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'AMS', 'MUC', 'LIS', 'NCE', 'JFK', 'ORD', 'LAX', 'SFO', 'YUL', 'GRU', 'JNB', 'CAI', 'DXB', 'DEL', 'BOM', 'PVG', 'NRT', 'SIN', 'BKK'] },
  { airline: 'TP', hub: 'LIS', destinations: ['CDG', 'ORY', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'AMS', 'ZRH', 'MUC', 'JFK', 'MIA', 'YYZ', 'YUL', 'GRU', 'GIG', 'EZE', 'LIM', 'CMN', 'DSS', 'LOS', 'NBO'] },
  { airline: 'TK', hub: 'IST', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'SVO', 'JFK', 'ORD', 'LAX', 'MIA', 'YYZ', 'GRU', 'EZE', 'CMN', 'TUN', 'CAI', 'NBO', 'JNB', 'LOS', 'DSS', 'DXB', 'DOH', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'ICN', 'SIN', 'BKK'] },
  { airline: 'EK', hub: 'DXB', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'LAX', 'ORD', 'SFO', 'MIA', 'YYZ', 'GRU', 'EZE', 'MEX', 'CMN', 'CAI', 'NBO', 'JNB', 'CPT', 'LOS', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL', 'AKL'] },
  { airline: 'QR', hub: 'DOH', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'LAX', 'ORD', 'MIA', 'YYZ', 'GRU', 'EZE', 'CMN', 'CAI', 'NBO', 'JNB', 'CPT', 'LOS', 'DSS', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL', 'AKL'] },
  { airline: 'EY', hub: 'AUH', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'FCO', 'AMS', 'ZRH', 'MUC', 'IST', 'JFK', 'ORD', 'YYZ', 'CAI', 'JNB', 'NBO', 'DEL', 'BOM', 'PVG', 'NRT', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL'] },
  { airline: 'AA', hub: 'JFK', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'LIS', 'IST', 'LAX', 'ORD', 'MIA', 'SFO', 'YYZ', 'YUL', 'MEX', 'GRU', 'GIG', 'EZE', 'SCL', 'LIM', 'DXB', 'DOH', 'DEL', 'HND', 'ICN'] },
  { airline: 'DL', hub: 'ORD', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'FCO', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'LAX', 'MIA', 'SFO', 'YYZ', 'YUL', 'MEX', 'GRU', 'EZE', 'LIM', 'JNB', 'DXB', 'DOH', 'PEK', 'PVG', 'NRT', 'ICN'] },
  { airline: 'UA', hub: 'SFO', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'FCO', 'AMS', 'ZRH', 'MUC', 'JFK', 'LAX', 'ORD', 'MIA', 'YYZ', 'MEX', 'GRU', 'SCL', 'LIM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL', 'AKL', 'DEL'] },
  { airline: 'AC', hub: 'YYZ', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'LAX', 'ORD', 'MIA', 'SFO', 'YUL', 'MEX', 'GRU', 'EZE', 'LIM', 'DXB', 'DOH', 'DEL', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SYD'] },
  { airline: 'SQ', hub: 'SIN', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'IST', 'JFK', 'LAX', 'SFO', 'DXB', 'DOH', 'AUH', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'BKK', 'SYD', 'MEL', 'AKL', 'JNB', 'CPT'] },
  { airline: 'NH', hub: 'HND', destinations: ['CDG', 'LHR', 'FRA', 'MUC', 'FCO', 'AMS', 'BCN', 'IST', 'JFK', 'LAX', 'ORD', 'SFO', 'MIA', 'YYZ', 'MEX', 'DXB', 'DOH', 'DEL', 'BOM', 'PEK', 'PVG', 'ICN', 'SIN', 'BKK', 'SYD', 'NRT'] },
  { airline: 'CA', hub: 'PEK', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'IST', 'SVO', 'JFK', 'LAX', 'ORD', 'SFO', 'YYZ', 'YUL', 'GRU', 'DXB', 'DOH', 'DEL', 'BOM', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL', 'JNB'] },
  { airline: 'AI', hub: 'DEL', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'IST', 'JFK', 'ORD', 'SFO', 'YYZ', 'YUL', 'DXB', 'DOH', 'AUH', 'JED', 'BOM', 'PEK', 'PVG', 'NRT', 'HND', 'ICN', 'SIN', 'BKK', 'SYD', 'MEL', 'NBO', 'CAI'] },
  { airline: 'QF', hub: 'SYD', destinations: ['LHR', 'CDG', 'FRA', 'FCO', 'IST', 'LAX', 'SFO', 'JFK', 'ORD', 'YYZ', 'SCL', 'GRU', 'JNB', 'DXB', 'DOH', 'SIN', 'BKK', 'HND', 'NRT', 'ICN', 'PVG', 'PEK', 'DEL', 'BOM', 'MEL', 'AKL'] },
  { airline: 'SA', hub: 'JNB', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'FCO', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'ORD', 'GRU', 'EZE', 'CPT', 'NBO', 'LOS', 'DSS', 'CAI', 'CMN', 'DXB', 'DOH', 'DEL', 'BOM', 'PVG', 'SIN', 'BKK', 'SYD', 'MEL'] },
  { airline: 'AT', hub: 'CMN', destinations: ['CDG', 'ORY', 'LYS', 'NCE', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'JFK', 'MIA', 'YUL', 'YYZ', 'GRU', 'RAK', 'TUN', 'CAI', 'DSS', 'NBO', 'LOS', 'JNB', 'DXB', 'DOH', 'JED'] },
  { airline: 'MS', hub: 'CAI', destinations: ['CDG', 'LHR', 'FRA', 'MAD', 'BCN', 'FCO', 'MXP', 'AMS', 'ZRH', 'MUC', 'LIS', 'IST', 'SVO', 'JFK', 'YYZ', 'TUN', 'CMN', 'DSS', 'NBO', 'LOS', 'JNB', 'DXB', 'DOH', 'AUH', 'JED', 'DEL', 'BOM', 'PEK', 'PVG', 'NRT', 'BKK'] },
  { airline: 'LA', hub: 'SCL', destinations: ['MAD', 'BCN', 'FCO', 'CDG', 'LHR', 'FRA', 'LIS', 'JFK', 'MIA', 'LAX', 'ORD', 'YYZ', 'MEX', 'GRU', 'GIG', 'EZE', 'LIM', 'AKL', 'SYD'] },
  { airline: 'TU', hub: 'TUN', destinations: ['CDG', 'ORY', 'LYS', 'NCE', 'MAD', 'BCN', 'FCO', 'MXP', 'FRA', 'MUC', 'AMS', 'ZRH', 'LIS', 'IST', 'LHR', 'CMN', 'CAI', 'DSS', 'JED', 'DXB', 'DOH'] },
  { airline: 'KQ', hub: 'NBO', destinations: ['CDG', 'LHR', 'AMS', 'FRA', 'FCO', 'MAD', 'IST', 'JFK', 'CAI', 'LOS', 'JNB', 'CPT', 'DSS', 'CMN', 'DXB', 'DOH', 'JED', 'DEL', 'BOM', 'PVG', 'BKK', 'SIN'] },
];
