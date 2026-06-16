export interface LogoBrand {
  name: string;
  aliases: string[];
  domain: string;
  category: string;
  country: string;
  tier: 1 | 2 | 3;
  hints: string[];
}

// ── TIER 1 — Famous icon logos, no readable brand text ──────────────────────
const T1: LogoBrand[] = [
  {
    name: "Nike", aliases: ["nike"], domain: "nike.com",
    category: "Sportswear", country: "🇺🇸 USA", tier: 1,
    hints: ["Their iconic symbol is called the 'Swoosh'.", "Their famous slogan is 'Just Do It'.", "Founded in 1964 as Blue Ribbon Sports."],
  },
  {
    name: "Apple", aliases: ["apple"], domain: "apple.com",
    category: "Technology", country: "🇺🇸 USA", tier: 1,
    hints: ["Makes one of the world's most popular smartphones.", "HQ in Cupertino, California is shaped like a giant ring.", "Founded by Steve Jobs, Wozniak and Wayne in 1976."],
  },
  {
    name: "BMW", aliases: ["bmw", "bayerische motoren werke"], domain: "bmw.com",
    category: "Automotive", country: "🇩🇪 Germany", tier: 1,
    hints: ["Their logo represents a spinning aircraft propeller.", "Slogan: 'The Ultimate Driving Machine'.", "Founded in Munich in 1916, they also make motorcycles."],
  },
  {
    name: "Mercedes-Benz", aliases: ["mercedes", "mercedes-benz", "mercedes benz"], domain: "mercedes-benz.com",
    category: "Automotive", country: "🇩🇪 Germany", tier: 1,
    hints: ["Their three-pointed star represents land, sea, and air.", "They claim to have invented the first automobile in 1886.", "Their AMG division is based in Affalterbach."],
  },
  {
    name: "Audi", aliases: ["audi"], domain: "audi.com",
    category: "Automotive", country: "🇩🇪 Germany", tier: 1,
    hints: ["Four interlocking rings represent four companies that merged in 1932.", "Slogan: 'Vorsprung durch Technik'.", "Part of the Volkswagen Group, HQ in Ingolstadt."],
  },
  {
    name: "Shell", aliases: ["shell"], domain: "shell.com",
    category: "Energy / Oil", country: "🇳🇱 Netherlands", tier: 1,
    hints: ["One of the most recognized logos in the world.", "The symbol is a pecten shell, used since 1904.", "One of the largest oil and gas companies on Earth."],
  },
  {
    name: "McDonald's", aliases: ["mcdonalds", "mcdonald's", "mcd", "macdo", "mac do"], domain: "mcdonalds.com",
    category: "Fast Food", country: "🇺🇸 USA", tier: 1,
    hints: ["Their golden arches are among the most recognized symbols on Earth.", "They serve over 69 million customers daily in 100+ countries.", "Their most iconic product was introduced in 1968."],
  },
  {
    name: "Spotify", aliases: ["spotify"], domain: "spotify.com",
    category: "Music Streaming", country: "🇸🇪 Sweden", tier: 1,
    hints: ["This green streaming app launched in 2008 in Stockholm.", "Their logo shows three curved lines representing sound waves.", "Over 600 million active users worldwide."],
  },
  {
    name: "Instagram", aliases: ["instagram", "insta", "ig"], domain: "instagram.com",
    category: "Social Media", country: "🇺🇸 USA", tier: 1,
    hints: ["Acquired by Facebook (Meta) in 2012.", "Originally launched in 2010 as a photo-only platform.", "Their icon is a stylized camera."],
  },
  {
    name: "Snapchat", aliases: ["snapchat", "snap"], domain: "snapchat.com",
    category: "Social Media", country: "🇺🇸 USA", tier: 1,
    hints: ["Their logo is a white ghost on a yellow background.", "Messages on this platform disappear after being viewed.", "Founded in 2011 by Evan Spiegel and Bobby Murphy."],
  },
  {
    name: "Discord", aliases: ["discord"], domain: "discord.com",
    category: "Communication", country: "🇺🇸 USA", tier: 1,
    hints: ["Originally built for gamers to chat while playing.", "Their mascot is called Wumpus.", "Launched in 2015, now has over 500 million registered users."],
  },
  {
    name: "GitHub", aliases: ["github"], domain: "github.com",
    category: "Developer Tools", country: "🇺🇸 USA", tier: 1,
    hints: ["Their mascot is called 'Octocat' — a cat with octopus tentacles.", "Hosts millions of open-source software repositories.", "Acquired by Microsoft in 2018 for $7.5 billion."],
  },
  {
    name: "Firefox", aliases: ["firefox", "mozilla firefox", "mozilla"], domain: "mozilla.org",
    category: "Technology", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo shows a fiery animal wrapping around a blue globe.", "Developed by the non-profit Mozilla Foundation.", "The 'fox' in the name is actually a red panda."],
  },
  {
    name: "Volkswagen", aliases: ["volkswagen", "vw"], domain: "volkswagen.com",
    category: "Automotive", country: "🇩🇪 Germany", tier: 1,
    hints: ["Their name means 'People's Car' in German.", "The Beetle was their first mass-market vehicle.", "Founded in 1937, Europe's largest automaker."],
  },
  {
    name: "Ferrari", aliases: ["ferrari"], domain: "ferrari.com",
    category: "Automotive", country: "🇮🇹 Italy", tier: 1,
    hints: ["Logo features a black prancing horse on a yellow shield.", "Based in Maranello, Italy — they also compete in Formula 1.", "Founded by Enzo Ferrari in 1939."],
  },
  {
    name: "Lamborghini", aliases: ["lamborghini", "lambo"], domain: "lamborghini.com",
    category: "Automotive", country: "🇮🇹 Italy", tier: 1,
    hints: ["Logo shows a charging bull — the founder was born under Taurus.", "Ferruccio, the founder, originally manufactured tractors.", "Based in Sant'Agata Bolognese, founded in 1963."],
  },
  {
    name: "Puma", aliases: ["puma"], domain: "puma.com",
    category: "Sportswear", country: "🇩🇪 Germany", tier: 1,
    hints: ["Logo is a leaping big cat.", "Co-founded by Rudolf Dassler — his brother founded a rival brand.", "Based in Herzogenaurach, the same town as their rival."],
  },
  {
    name: "Adidas", aliases: ["adidas"], domain: "adidas.com",
    category: "Sportswear", country: "🇩🇪 Germany", tier: 1,
    hints: ["Logo is three parallel stripes or a trefoil.", "Founded by Adolf 'Adi' Dassler in 1949.", "Their rival brand was founded by Adi's own brother."],
  },
  {
    name: "Starbucks", aliases: ["starbucks"], domain: "starbucks.com",
    category: "Coffee", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo features a twin-tailed mermaid called a Siren.", "Named after a character in the novel Moby Dick.", "Founded in Seattle in 1971, now 35,000+ locations worldwide."],
  },
  {
    name: "Mastercard", aliases: ["mastercard", "master card"], domain: "mastercard.com",
    category: "Finance", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is two overlapping circles — one red, one orange.", "They process billions of transactions in 210+ countries.", "Founded in 1966 as Interbank Card Association."],
  },
  {
    name: "Target", aliases: ["target"], domain: "target.com",
    category: "Retail", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is a red bullseye — a circle within a circle.", "7th largest retailer in the United States.", "Founded in Minneapolis in 1902 as Dayton Dry Goods."],
  },
  {
    name: "Airbnb", aliases: ["airbnb", "air bnb"], domain: "airbnb.com",
    category: "Travel", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is called 'the Bélo' and represents belonging.", "Platform lets people rent out their homes to travelers.", "Founded in 2008 when founders rented out air mattresses."],
  },
  {
    name: "Twitter", aliases: ["twitter", "x", "twitter x", "x.com"], domain: "x.com",
    category: "Social Media", country: "🇺🇸 USA", tier: 1,
    hints: ["Originally built around short text messages of 140 characters.", "The original bird logo was named 'Larry' after a basketball player.", "Acquired by Elon Musk in 2022 and rebranded to 'X'."],
  },
  {
    name: "TikTok", aliases: ["tiktok", "tik tok"], domain: "tiktok.com",
    category: "Social Media", country: "🇨🇳 China", tier: 1,
    hints: ["Logo looks like a musical note.", "Owned by ByteDance, a Chinese company.", "Reached 1 billion users faster than any platform before."],
  },
  {
    name: "Lacoste", aliases: ["lacoste"], domain: "lacoste.com",
    category: "Fashion", country: "🇫🇷 France", tier: 1,
    hints: ["Logo is a green crocodile.", "Founded by tennis champion René Lacoste, nicknamed 'the Crocodile'.", "The iconic polo shirt was invented by their founder in 1933."],
  },
  {
    name: "Rolex", aliases: ["rolex"], domain: "rolex.com",
    category: "Luxury Watches", country: "🇨🇭 Switzerland", tier: 1,
    hints: ["Logo is a golden crown.", "Founded in London in 1905 by Hans Wilsdorf.", "One of their watches sold at auction for over $17 million."],
  },
  {
    name: "PlayStation", aliases: ["playstation", "sony playstation", "ps"], domain: "playstation.com",
    category: "Gaming", country: "🇯🇵 Japan", tier: 1,
    hints: ["Logo uses four shapes: circle, cross, square, and triangle.", "Made by Sony, first launched in Japan in 1994.", "One of the best-selling gaming brands of all time."],
  },
  {
    name: "Red Bull", aliases: ["red bull", "redbull"], domain: "redbull.com",
    category: "Energy Drinks", country: "🇦🇹 Austria", tier: 1,
    hints: ["Logo shows two bulls charging toward each other in front of a sun.", "Slogan: 'Red Bull gives you wings'.", "They own a Formula 1 team and multiple football clubs."],
  },
  {
    name: "Ralph Lauren", aliases: ["ralph lauren", "polo ralph lauren", "polo"], domain: "ralphlauren.com",
    category: "Fashion", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo shows a polo player on horseback.", "Founded by Ralph Lifshitz in 1967.", "Known for preppy American style."],
  },
  {
    name: "Under Armour", aliases: ["under armour", "ua", "underarmour"], domain: "underarmour.com",
    category: "Sportswear", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is two mirrored 'U' letters interlocked.", "Founded in 1996 by Kevin Plank from his grandmother's basement.", "Originally focused on moisture-wicking athletic shirts."],
  },
  {
    name: "Porsche", aliases: ["porsche"], domain: "porsche.com",
    category: "Automotive", country: "🇩🇪 Germany", tier: 1,
    hints: ["Logo features a black horse and red antlers — borrowed from Stuttgart's coat of arms.", "Their 911 model has been in production since 1963.", "Also famous for winning the 24 Hours of Le Mans."],
  },
  {
    name: "Toyota", aliases: ["toyota"], domain: "toyota.com",
    category: "Automotive", country: "🇯🇵 Japan", tier: 1,
    hints: ["Their logo contains three overlapping ovals.", "World's best-selling automaker for multiple years.", "Founded in 1937 by Kiichiro Toyoda."],
  },
  {
    name: "Chevrolet", aliases: ["chevrolet", "chevy"], domain: "chevrolet.com",
    category: "Automotive", country: "🇺🇸 USA", tier: 1,
    hints: ["Their 'bowtie' logo has been used since 1913.", "Part of General Motors.", "Their Corvette is one of America's most iconic sports cars."],
  },
  {
    name: "Jeep", aliases: ["jeep"], domain: "jeep.com",
    category: "Automotive", country: "🇺🇸 USA", tier: 1,
    hints: ["Originally built as a military vehicle in World War II.", "Part of Stellantis.", "Famous for off-road capability."],
  },
  {
    name: "Coca-Cola", aliases: ["coca-cola", "coke", "coca cola"], domain: "coca-cola.com",
    category: "Beverages", country: "🇺🇸 USA", tier: 1,
    hints: ["Invented in 1886 by pharmacist John Pemberton in Atlanta.", "Their logo script has barely changed in over 130 years.", "Sold in more than 200 countries."],
  },
  {
    name: "Pepsi", aliases: ["pepsi", "pepsi cola"], domain: "pepsi.com",
    category: "Beverages", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is a circular red, white and blue emblem.", "Their eternal rival was invented just 13 years earlier.", "The logo has been redesigned over a dozen times."],
  },
  {
    name: "PayPal", aliases: ["paypal"], domain: "paypal.com",
    category: "Finance", country: "🇺🇸 USA", tier: 1,
    hints: ["Founded in 1998, their early investors included Elon Musk.", "They enable payments in over 200 markets.", "Logo is two overlapping 'P' letterforms."],
  },
  {
    name: "Gucci", aliases: ["gucci"], domain: "gucci.com",
    category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 1,
    hints: ["Logo is two interlocked letter G's.", "Founded in Florence, Italy in 1921.", "One of the world's highest-grossing luxury brands."],
  },
  {
    name: "Louis Vuitton", aliases: ["louis vuitton", "lv", "lvmh louis vuitton"], domain: "louisvuitton.com",
    category: "Luxury Fashion", country: "🇫🇷 France", tier: 1,
    hints: ["Famous for their LV monogram on bags and luggage.", "Founded in Paris in 1854 as a luggage maker.", "Part of LVMH, the world's largest luxury group."],
  },
  {
    name: "Chanel", aliases: ["chanel", "coco chanel"], domain: "chanel.com",
    category: "Luxury Fashion", country: "🇫🇷 France", tier: 1,
    hints: ["Logo is two interlocked C's facing opposite directions.", "Founded by Gabrielle 'Coco' Chanel in 1910.", "No. 5 is one of the best-selling perfumes in history."],
  },
  {
    name: "Patagonia", aliases: ["patagonia"], domain: "patagonia.com",
    category: "Outdoor Apparel", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo features the silhouette of Fitz Roy mountain in Argentina.", "Founded by Yvon Chouinard in 1973.", "Donates 1% of sales to environmental causes."],
  },
  {
    name: "The North Face", aliases: ["the north face", "north face", "tnf"], domain: "thenorthface.com",
    category: "Outdoor Apparel", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo shows a stylized mountain and half-dome.", "Named after the coldest, most challenging side of a mountain.", "Founded in San Francisco in 1966."],
  },
  {
    name: "Converse", aliases: ["converse"], domain: "converse.com",
    category: "Footwear", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is a five-pointed star inside a circle.", "Their Chuck Taylor All Stars have been sold since 1917.", "Acquired by Nike in 2003."],
  },
  {
    name: "Heineken", aliases: ["heineken"], domain: "heineken.com",
    category: "Beer", country: "🇳🇱 Netherlands", tier: 1,
    hints: ["Their logo uses a special 'smiling' red star.", "The letters in their name are slightly tilted — including the famous 'e'.", "Founded in Amsterdam in 1873."],
  },
  {
    name: "Nintendo", aliases: ["nintendo"], domain: "nintendo.com",
    category: "Gaming", country: "🇯🇵 Japan", tier: 1,
    hints: ["Home of Mario, Zelda, and Pokémon.", "Originally founded in 1889 as a playing card company.", "Their Switch console sold over 140 million units."],
  },
  {
    name: "LEGO", aliases: ["lego"], domain: "lego.com",
    category: "Toys", country: "🇩🇰 Denmark", tier: 1,
    hints: ["Name comes from the Danish words 'leg godt' meaning 'play well'.", "Founded in 1932 by Ole Kirk Christiansen.", "Their signature bricks have been compatible since 1958."],
  },
  {
    name: "Bentley", aliases: ["bentley", "bentley motors"], domain: "bentley.com",
    category: "Automotive", country: "🇬🇧 UK", tier: 1,
    hints: ["Logo features a stylized 'B' with wings.", "Founded in 1919 by W.O. Bentley in London.", "Now part of the Volkswagen Group."],
  },
  {
    name: "Harley-Davidson", aliases: ["harley-davidson", "harley davidson", "harley", "hd"], domain: "harley-davidson.com",
    category: "Motorcycles", country: "🇺🇸 USA", tier: 1,
    hints: ["Logo is a bar-and-shield design.", "Founded in Milwaukee, Wisconsin in 1903.", "One of the most tattooed brand logos in the world."],
  },
  {
    name: "Rolls-Royce", aliases: ["rolls-royce", "rolls royce", "rr"], domain: "rolls-roycemotorcars.com",
    category: "Automotive", country: "🇬🇧 UK", tier: 1,
    hints: ["Logo features a double 'R' monogram.", "Their hood ornament is called 'The Spirit of Ecstasy'.", "Founded in 1906 by Charles Rolls and Henry Royce."],
  },
];

// ── TIER 2 — Well-known brands, 1–2 hints ───────────────────────────────────
const T2: LogoBrand[] = [
  { name: "Google", aliases: ["google"], domain: "google.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["World's most used search engine, founded in 1998."] },
  { name: "Microsoft", aliases: ["microsoft"], domain: "microsoft.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["Makers of Windows and Office, founded by Bill Gates."] },
  { name: "Amazon", aliases: ["amazon"], domain: "amazon.com", category: "E-commerce", country: "🇺🇸 USA", tier: 2, hints: ["Started as an online bookstore in Jeff Bezos's garage in 1994."] },
  { name: "Netflix", aliases: ["netflix"], domain: "netflix.com", category: "Streaming", country: "🇺🇸 USA", tier: 2, hints: ["Started as a DVD mail-rental service before pivoting to streaming."] },
  { name: "Meta", aliases: ["meta", "facebook meta"], domain: "meta.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["Parent company of Facebook, Instagram and WhatsApp."] },
  { name: "Tesla", aliases: ["tesla"], domain: "tesla.com", category: "Automotive / Energy", country: "🇺🇸 USA", tier: 2, hints: ["The world's most valuable electric car company, led by Elon Musk."] },
  { name: "Samsung", aliases: ["samsung"], domain: "samsung.com", category: "Technology", country: "🇰🇷 South Korea", tier: 2, hints: ["South Korean conglomerate that makes smartphones, TVs and chips."] },
  { name: "Honda", aliases: ["honda"], domain: "honda.com", category: "Automotive", country: "🇯🇵 Japan", tier: 2, hints: ["Also the world's largest motorcycle manufacturer."] },
  { name: "Ford", aliases: ["ford", "ford motors"], domain: "ford.com", category: "Automotive", country: "🇺🇸 USA", tier: 2, hints: ["Founder Henry Ford popularized the assembly line in 1913."] },
  { name: "Volvo", aliases: ["volvo"], domain: "volvo.com", category: "Automotive", country: "🇸🇪 Sweden", tier: 2, hints: ["Swedish brand famous for safety innovations in cars."] },
  { name: "Hyundai", aliases: ["hyundai"], domain: "hyundai.com", category: "Automotive", country: "🇰🇷 South Korea", tier: 2, hints: ["South Korean automaker that also builds ships and construction equipment."] },
  { name: "Kia", aliases: ["kia"], domain: "kia.com", category: "Automotive", country: "🇰🇷 South Korea", tier: 2, hints: ["Sister brand to Hyundai, their name means 'rising from Asia'."] },
  { name: "Land Rover", aliases: ["land rover", "landrover"], domain: "landrover.com", category: "Automotive", country: "🇬🇧 UK", tier: 2, hints: ["British brand famous for luxury off-road SUVs."] },
  { name: "Jaguar", aliases: ["jaguar"], domain: "jaguar.com", category: "Automotive", country: "🇬🇧 UK", tier: 2, hints: ["British luxury car brand named after the big cat."] },
  { name: "Subaru", aliases: ["subaru"], domain: "subaru.com", category: "Automotive", country: "🇯🇵 Japan", tier: 2, hints: ["Famous for all-wheel drive and beloved by rally fans."] },
  { name: "Nissan", aliases: ["nissan"], domain: "nissan.com", category: "Automotive", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese automaker known for the GT-R and the Leaf EV."] },
  { name: "Mazda", aliases: ["mazda"], domain: "mazda.com", category: "Automotive", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese automaker known for their rotary engines."] },
  { name: "Mitsubishi", aliases: ["mitsubishi"], domain: "mitsubishi.com", category: "Automotive", country: "🇯🇵 Japan", tier: 2, hints: ["Their name means 'three diamonds' in Japanese."] },
  { name: "Alfa Romeo", aliases: ["alfa romeo", "alfa"], domain: "alfaromeo.com", category: "Automotive", country: "🇮🇹 Italy", tier: 2, hints: ["Italian brand with a cross and serpent in their logo."] },
  { name: "Maserati", aliases: ["maserati"], domain: "maserati.com", category: "Automotive", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand with a trident symbol from Neptune's fountain."] },
  { name: "Bugatti", aliases: ["bugatti"], domain: "bugatti.com", category: "Automotive", country: "🇫🇷 France", tier: 2, hints: ["French hypercar brand that made the world's fastest production car."] },
  { name: "McLaren", aliases: ["mclaren"], domain: "mclaren.com", category: "Automotive", country: "🇬🇧 UK", tier: 2, hints: ["British supercar maker that also competes in Formula 1."] },
  { name: "Aston Martin", aliases: ["aston martin"], domain: "astonmartin.com", category: "Automotive", country: "🇬🇧 UK", tier: 2, hints: ["Famous as James Bond's car of choice."] },
  { name: "Peugeot", aliases: ["peugeot"], domain: "peugeot.com", category: "Automotive", country: "🇫🇷 France", tier: 2, hints: ["French automaker whose logo is a lion — one of Europe's oldest car brands."] },
  { name: "Renault", aliases: ["renault"], domain: "renault.com", category: "Automotive", country: "🇫🇷 France", tier: 2, hints: ["French automaker and major player in Formula 1."] },
  { name: "Citroën", aliases: ["citroen", "citroën"], domain: "citroen.com", category: "Automotive", country: "🇫🇷 France", tier: 2, hints: ["French brand whose double chevron logo is one of Europe's most distinctive."] },
  { name: "Fiat", aliases: ["fiat"], domain: "fiat.com", category: "Automotive", country: "🇮🇹 Italy", tier: 2, hints: ["Italian automaker known for small, efficient city cars."] },
  { name: "Seat", aliases: ["seat"], domain: "seat.com", category: "Automotive", country: "🇪🇸 Spain", tier: 2, hints: ["Spain's only mass-market car manufacturer, part of the VW Group."] },
  { name: "Skoda", aliases: ["skoda", "škoda"], domain: "skoda-auto.com", category: "Automotive", country: "🇨🇿 Czech Republic", tier: 2, hints: ["Czech automaker and one of the oldest car brands in the world."] },
  { name: "IKEA", aliases: ["ikea"], domain: "ikea.com", category: "Retail / Furniture", country: "🇸🇪 Sweden", tier: 2, hints: ["Swedish furniture giant where products have unpronounced Nordic names."] },
  { name: "H&M", aliases: ["h&m", "hm", "hennes mauritz"], domain: "hm.com", category: "Fashion", country: "🇸🇪 Sweden", tier: 2, hints: ["Swedish fast-fashion brand with stores in 77 countries."] },
  { name: "Zara", aliases: ["zara"], domain: "zara.com", category: "Fashion", country: "🇪🇸 Spain", tier: 2, hints: ["Spanish fashion brand owned by Inditex, the world's largest apparel retailer."] },
  { name: "Hermès", aliases: ["hermes", "hermès"], domain: "hermes.com", category: "Luxury Fashion", country: "🇫🇷 France", tier: 2, hints: ["French luxury house famous for their Birkin and Kelly handbags."] },
  { name: "Prada", aliases: ["prada"], domain: "prada.com", category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand founded in Milan in 1913."] },
  { name: "Versace", aliases: ["versace", "gianni versace"], domain: "versace.com", category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 2, hints: ["Italian fashion house whose logo is the Medusa head."] },
  { name: "Armani", aliases: ["armani", "giorgio armani"], domain: "armani.com", category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand founded by Giorgio Armani in 1975."] },
  { name: "Burberry", aliases: ["burberry"], domain: "burberry.com", category: "Luxury Fashion", country: "🇬🇧 UK", tier: 2, hints: ["British brand famous for their tartan plaid pattern."] },
  { name: "Coach", aliases: ["coach", "coach new york"], domain: "coach.com", category: "Fashion", country: "🇺🇸 USA", tier: 2, hints: ["American luxury leather goods brand founded in NYC in 1941."] },
  { name: "Calvin Klein", aliases: ["calvin klein", "ck"], domain: "calvinklein.com", category: "Fashion", country: "🇺🇸 USA", tier: 2, hints: ["American fashion brand famous for minimalist denim and underwear."] },
  { name: "Tommy Hilfiger", aliases: ["tommy hilfiger", "tommy"], domain: "tommy.com", category: "Fashion", country: "🇺🇸 USA", tier: 2, hints: ["American preppy brand recognizable by its red-white-blue color scheme."] },
  { name: "Levi's", aliases: ["levis", "levi's", "levi strauss"], domain: "levi.com", category: "Fashion", country: "🇺🇸 USA", tier: 2, hints: ["Invented the blue jeans in San Francisco in 1873."] },
  { name: "Uniqlo", aliases: ["uniqlo"], domain: "uniqlo.com", category: "Fashion", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese basics brand known for their HeatTech and Airism lines."] },
  { name: "Vans", aliases: ["vans"], domain: "vans.com", category: "Footwear", country: "🇺🇸 USA", tier: 2, hints: ["Famous for their checkered slip-ons, beloved by skaters since 1966."] },
  { name: "New Balance", aliases: ["new balance", "nb"], domain: "newbalance.com", category: "Footwear", country: "🇺🇸 USA", tier: 2, hints: ["One of the few major sneaker brands that still manufactures in the USA."] },
  { name: "Fila", aliases: ["fila"], domain: "fila.com", category: "Sportswear", country: "🇰🇷 South Korea", tier: 2, hints: ["Italian-born brand now owned by a South Korean company."] },
  { name: "Asics", aliases: ["asics"], domain: "asics.com", category: "Sportswear", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese sports brand whose name is a Latin acronym for a healthy mind in a healthy body."] },
  { name: "Reebok", aliases: ["reebok"], domain: "reebok.com", category: "Sportswear", country: "🇬🇧 UK", tier: 2, hints: ["British brand originally known for making spiked running shoes in the 1890s."] },
  { name: "Crocs", aliases: ["crocs"], domain: "crocs.com", category: "Footwear", country: "🇺🇸 USA", tier: 2, hints: ["Famous for their foam clogs with holes, loved and hated in equal measure."] },
  { name: "Timberland", aliases: ["timberland"], domain: "timberland.com", category: "Footwear / Apparel", country: "🇺🇸 USA", tier: 2, hints: ["Famous for their yellow waterproof work boots since 1973."] },
  { name: "Columbia", aliases: ["columbia sportswear", "columbia"], domain: "columbia.com", category: "Outdoor Apparel", country: "🇺🇸 USA", tier: 2, hints: ["American outdoor clothing company headquartered in Portland, Oregon."] },
  { name: "Salomon", aliases: ["salomon"], domain: "salomon.com", category: "Outdoor Sports", country: "🇫🇷 France", tier: 2, hints: ["French brand specializing in ski and trail running equipment."] },
  { name: "Uber", aliases: ["uber"], domain: "uber.com", category: "Transportation", country: "🇺🇸 USA", tier: 2, hints: ["Ride-hailing app founded in San Francisco in 2009."] },
  { name: "Lyft", aliases: ["lyft"], domain: "lyft.com", category: "Transportation", country: "🇺🇸 USA", tier: 2, hints: ["Uber's main competitor in the American ride-sharing market."] },
  { name: "Zoom", aliases: ["zoom"], domain: "zoom.us", category: "Communication", country: "🇺🇸 USA", tier: 2, hints: ["Video conferencing platform that exploded in usage during 2020."] },
  { name: "Adobe", aliases: ["adobe"], domain: "adobe.com", category: "Software", country: "🇺🇸 USA", tier: 2, hints: ["Makers of Photoshop, Illustrator, and Premiere Pro."] },
  { name: "Slack", aliases: ["slack"], domain: "slack.com", category: "Communication", country: "🇺🇸 USA", tier: 2, hints: ["Team messaging platform acquired by Salesforce in 2021."] },
  { name: "Dropbox", aliases: ["dropbox"], domain: "dropbox.com", category: "Cloud Storage", country: "🇺🇸 USA", tier: 2, hints: ["One of the first mainstream cloud storage platforms."] },
  { name: "Figma", aliases: ["figma"], domain: "figma.com", category: "Design Tools", country: "🇺🇸 USA", tier: 2, hints: ["Collaborative design tool that runs in the browser."] },
  { name: "Canva", aliases: ["canva"], domain: "canva.com", category: "Design Tools", country: "🇦🇺 Australia", tier: 2, hints: ["Easy-to-use graphic design tool founded in Australia in 2012."] },
  { name: "Shopify", aliases: ["shopify"], domain: "shopify.com", category: "E-commerce", country: "🇨🇦 Canada", tier: 2, hints: ["Canadian platform that powers over 1.7 million online stores worldwide."] },
  { name: "Stripe", aliases: ["stripe"], domain: "stripe.com", category: "Fintech", country: "🇮🇪 Ireland", tier: 2, hints: ["Payment infrastructure company used by millions of businesses online."] },
  { name: "YouTube", aliases: ["youtube", "yt"], domain: "youtube.com", category: "Video Streaming", country: "🇺🇸 USA", tier: 2, hints: ["Largest video platform on Earth, acquired by Google in 2006."] },
  { name: "LinkedIn", aliases: ["linkedin"], domain: "linkedin.com", category: "Social Media", country: "🇺🇸 USA", tier: 2, hints: ["Professional social network acquired by Microsoft in 2016."] },
  { name: "Pinterest", aliases: ["pinterest"], domain: "pinterest.com", category: "Social Media", country: "🇺🇸 USA", tier: 2, hints: ["Image bookmarking platform popular for recipes, DIY and fashion."] },
  { name: "Reddit", aliases: ["reddit"], domain: "reddit.com", category: "Social Media", country: "🇺🇸 USA", tier: 2, hints: ["'The front page of the internet' — a community forum network."] },
  { name: "Telegram", aliases: ["telegram"], domain: "telegram.org", category: "Communication", country: "🇦🇪 UAE", tier: 2, hints: ["Privacy-focused messaging app with massive group capabilities."] },
  { name: "WhatsApp", aliases: ["whatsapp", "whats app"], domain: "whatsapp.com", category: "Communication", country: "🇺🇸 USA", tier: 2, hints: ["Messaging app with over 2 billion users, owned by Meta."] },
  { name: "Duolingo", aliases: ["duolingo"], domain: "duolingo.com", category: "Education", country: "🇺🇸 USA", tier: 2, hints: ["Language-learning app known for its guilt-tripping green owl mascot."] },
  { name: "Twitch", aliases: ["twitch"], domain: "twitch.tv", category: "Gaming / Streaming", country: "🇺🇸 USA", tier: 2, hints: ["Live-streaming platform primarily for gamers, acquired by Amazon."] },
  { name: "Steam", aliases: ["steam"], domain: "steampowered.com", category: "Gaming", country: "🇺🇸 USA", tier: 2, hints: ["Valve's PC gaming platform with over 50,000 games available."] },
  { name: "Epic Games", aliases: ["epic games", "epic"], domain: "epicgames.com", category: "Gaming", country: "🇺🇸 USA", tier: 2, hints: ["Makers of Fortnite and the Unreal Engine."] },
  { name: "EA", aliases: ["ea", "electronic arts", "ea games"], domain: "ea.com", category: "Gaming", country: "🇺🇸 USA", tier: 2, hints: ["Publisher of FIFA/FC, Madden, Sims and Apex Legends."] },
  { name: "Ubisoft", aliases: ["ubisoft"], domain: "ubisoft.com", category: "Gaming", country: "🇫🇷 France", tier: 2, hints: ["French gaming company behind Assassin's Creed and Rainbow Six."] },
  { name: "Xbox", aliases: ["xbox", "microsoft xbox"], domain: "xbox.com", category: "Gaming", country: "🇺🇸 USA", tier: 2, hints: ["Microsoft's gaming brand, launched to compete with PlayStation in 2001."] },
  { name: "Nestlé", aliases: ["nestle", "nestlé"], domain: "nestle.com", category: "Food & Beverage", country: "🇨🇭 Switzerland", tier: 2, hints: ["World's largest food & beverage company — makes KitKat, Nescafé and more."] },
  { name: "KFC", aliases: ["kfc", "kentucky fried chicken"], domain: "kfc.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["Fried chicken chain whose founder Colonel Sanders started at age 65."] },
  { name: "Burger King", aliases: ["burger king", "bk"], domain: "burgerking.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["McDonald's main rival, famous for the Whopper."] },
  { name: "Pizza Hut", aliases: ["pizza hut"], domain: "pizzahut.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["World's largest pizza restaurant chain by total locations."] },
  { name: "Domino's", aliases: ["dominos", "domino's", "domino's pizza"], domain: "dominos.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["Pizza chain famous for its 30-minute delivery guarantee."] },
  { name: "Subway", aliases: ["subway"], domain: "subway.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["The world's largest fast food chain by number of locations."] },
  { name: "Dunkin'", aliases: ["dunkin", "dunkin'", "dunkin donuts"], domain: "dunkindonuts.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["American coffee and donut chain, formerly called Dunkin' Donuts."] },
  { name: "Chipotle", aliases: ["chipotle"], domain: "chipotle.com", category: "Fast Food", country: "🇺🇸 USA", tier: 2, hints: ["Mexican-inspired fast-casual chain famous for their giant burritos."] },
  { name: "Nespresso", aliases: ["nespresso"], domain: "nespresso.com", category: "Coffee", country: "🇨🇭 Switzerland", tier: 2, hints: ["Nestlé's premium coffee capsule brand endorsed by George Clooney."] },
  { name: "Dolce & Gabbana", aliases: ["dolce gabbana", "dolce & gabbana", "d&g", "dg"], domain: "dolcegabbana.com", category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand founded by Domenico Dolce and Stefano Gabbana."] },
  { name: "Balenciaga", aliases: ["balenciaga"], domain: "balenciaga.com", category: "Luxury Fashion", country: "🇪🇸 Spain", tier: 2, hints: ["Luxury house founded by Cristóbal Balenciaga in 1919, now owned by Kering."] },
  { name: "Dior", aliases: ["dior", "christian dior"], domain: "dior.com", category: "Luxury Fashion", country: "🇫🇷 France", tier: 2, hints: ["French fashion house whose 'New Look' revolutionized fashion in 1947."] },
  { name: "Saint Laurent", aliases: ["saint laurent", "ysl", "yves saint laurent"], domain: "ysl.com", category: "Luxury Fashion", country: "🇫🇷 France", tier: 2, hints: ["French luxury house famous for their initials YSL."] },
  { name: "Givenchy", aliases: ["givenchy"], domain: "givenchy.com", category: "Luxury Fashion", country: "🇫🇷 France", tier: 2, hints: ["French luxury house that dressed Audrey Hepburn."] },
  { name: "Valentino", aliases: ["valentino"], domain: "valentino.com", category: "Luxury Fashion", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand famous for their signature Valentino Red."] },
  { name: "Bvlgari", aliases: ["bvlgari", "bulgari"], domain: "bulgari.com", category: "Luxury", country: "🇮🇹 Italy", tier: 2, hints: ["Italian luxury brand famous for jewelry, watches and perfumes."] },
  { name: "Cartier", aliases: ["cartier"], domain: "cartier.com", category: "Luxury Jewelry", country: "🇫🇷 France", tier: 2, hints: ["French jeweler known as the 'jeweler of kings and king of jewelers'."] },
  { name: "Omega", aliases: ["omega"], domain: "omegawatches.com", category: "Luxury Watches", country: "🇨🇭 Switzerland", tier: 2, hints: ["Swiss watchmaker that timed the Olympic Games and went to the Moon."] },
  { name: "Tag Heuer", aliases: ["tag heuer", "tagheuer"], domain: "tagheuer.com", category: "Luxury Watches", country: "🇨🇭 Switzerland", tier: 2, hints: ["Swiss watchmaker and longtime sponsor of Formula 1."] },
  { name: "Tissot", aliases: ["tissot"], domain: "tissot.ch", category: "Watches", country: "🇨🇭 Switzerland", tier: 2, hints: ["Swiss watchmaker that is official timekeeper for many world sports."] },
  { name: "Hublot", aliases: ["hublot"], domain: "hublot.com", category: "Luxury Watches", country: "🇨🇭 Switzerland", tier: 2, hints: ["Swiss luxury watch brand known for their Big Bang model."] },
  { name: "Audemars Piguet", aliases: ["audemars piguet", "ap", "audemars"], domain: "audemarspiguet.com", category: "Luxury Watches", country: "🇨🇭 Switzerland", tier: 2, hints: ["Swiss manufacturer of the iconic Royal Oak watch."] },
  { name: "DHL", aliases: ["dhl"], domain: "dhl.com", category: "Logistics", country: "🇩🇪 Germany", tier: 2, hints: ["German logistics company whose red and yellow trucks are seen worldwide."] },
  { name: "FedEx", aliases: ["fedex", "federal express"], domain: "fedex.com", category: "Logistics", country: "🇺🇸 USA", tier: 2, hints: ["American delivery company whose logo contains a hidden arrow."] },
  { name: "UPS", aliases: ["ups"], domain: "ups.com", category: "Logistics", country: "🇺🇸 USA", tier: 2, hints: ["American package delivery company famous for their brown trucks."] },
  { name: "Lufthansa", aliases: ["lufthansa"], domain: "lufthansa.com", category: "Aviation", country: "🇩🇪 Germany", tier: 2, hints: ["Germany's largest airline with a crane bird in their logo."] },
  { name: "Air France", aliases: ["air france", "airfrance"], domain: "airfrance.com", category: "Aviation", country: "🇫🇷 France", tier: 2, hints: ["France's flag carrier airline, based at Charles de Gaulle airport."] },
  { name: "British Airways", aliases: ["british airways", "ba"], domain: "britishairways.com", category: "Aviation", country: "🇬🇧 UK", tier: 2, hints: ["UK's flag carrier airline, based at Heathrow."] },
  { name: "Emirates", aliases: ["emirates", "emirates airlines"], domain: "emirates.com", category: "Aviation", country: "🇦🇪 UAE", tier: 2, hints: ["Dubai's national airline, one of the world's largest."] },
  { name: "Singapore Airlines", aliases: ["singapore airlines", "sia"], domain: "singaporeair.com", category: "Aviation", country: "🇸🇬 Singapore", tier: 2, hints: ["Consistently ranked the world's best airline."] },
  { name: "Ryanair", aliases: ["ryanair"], domain: "ryanair.com", category: "Aviation", country: "🇮🇪 Ireland", tier: 2, hints: ["Europe's largest budget airline."] },
  { name: "Marriott", aliases: ["marriott"], domain: "marriott.com", category: "Hotels", country: "🇺🇸 USA", tier: 2, hints: ["World's largest hotel chain with 30+ brands and 8,000+ properties."] },
  { name: "Hilton", aliases: ["hilton", "hilton hotels"], domain: "hilton.com", category: "Hotels", country: "🇺🇸 USA", tier: 2, hints: ["One of the world's largest hotel chains, founded by Conrad Hilton in 1919."] },
  { name: "Visa", aliases: ["visa"], domain: "visa.com", category: "Finance", country: "🇺🇸 USA", tier: 2, hints: ["The world's most used payment network, accepted in 200+ countries."] },
  { name: "American Express", aliases: ["american express", "amex"], domain: "americanexpress.com", category: "Finance", country: "🇺🇸 USA", tier: 2, hints: ["Premium payment company known for their centurion black card."] },
  { name: "Goldman Sachs", aliases: ["goldman sachs", "goldman"], domain: "goldmansachs.com", category: "Finance", country: "🇺🇸 USA", tier: 2, hints: ["One of the world's most prestigious investment banks."] },
  { name: "HSBC", aliases: ["hsbc"], domain: "hsbc.com", category: "Finance", country: "🇬🇧 UK", tier: 2, hints: ["British bank that stands for Hongkong and Shanghai Banking Corporation."] },
  { name: "Coinbase", aliases: ["coinbase"], domain: "coinbase.com", category: "Crypto / Finance", country: "🇺🇸 USA", tier: 2, hints: ["America's largest cryptocurrency exchange platform."] },
  { name: "Intel", aliases: ["intel"], domain: "intel.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["World's largest semiconductor chip maker by revenue."] },
  { name: "NVIDIA", aliases: ["nvidia"], domain: "nvidia.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["GPU maker that became the most valuable chip company on Earth."] },
  { name: "AMD", aliases: ["amd", "advanced micro devices"], domain: "amd.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["Intel and NVIDIA's main rival in CPUs and GPUs."] },
  { name: "HP", aliases: ["hp", "hewlett packard"], domain: "hp.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["American tech company that started in a garage in Palo Alto in 1939."] },
  { name: "Dell", aliases: ["dell", "dell technologies"], domain: "dell.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["PC maker founded by Michael Dell from his university dorm room."] },
  { name: "Lenovo", aliases: ["lenovo"], domain: "lenovo.com", category: "Technology", country: "🇨🇳 China", tier: 2, hints: ["Chinese tech company that acquired IBM's ThinkPad laptop line."] },
  { name: "LG", aliases: ["lg", "lg electronics"], domain: "lg.com", category: "Technology", country: "🇰🇷 South Korea", tier: 2, hints: ["South Korean conglomerate whose name stands for 'Lucky Goldstar'."] },
  { name: "Philips", aliases: ["philips"], domain: "philips.com", category: "Technology", country: "🇳🇱 Netherlands", tier: 2, hints: ["Dutch company that invented the cassette tape and the CD."] },
  { name: "Siemens", aliases: ["siemens"], domain: "siemens.com", category: "Industrial / Technology", country: "🇩🇪 Germany", tier: 2, hints: ["German industrial giant that makes everything from trains to MRI machines."] },
  { name: "Bosch", aliases: ["bosch", "robert bosch"], domain: "bosch.com", category: "Industrial / Technology", country: "🇩🇪 Germany", tier: 2, hints: ["German engineering company and world's largest auto parts supplier."] },
  { name: "Sony", aliases: ["sony"], domain: "sony.com", category: "Technology", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese conglomerate that makes PlayStation, films and music."] },
  { name: "Panasonic", aliases: ["panasonic"], domain: "panasonic.com", category: "Technology", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese electronics giant that also makes Tesla's batteries."] },
  { name: "Canon", aliases: ["canon"], domain: "canon.com", category: "Technology", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese company that dominates the camera and printer markets."] },
  { name: "Nikon", aliases: ["nikon"], domain: "nikon.com", category: "Technology", country: "🇯🇵 Japan", tier: 2, hints: ["Japanese camera manufacturer and Canon's biggest rival."] },
  { name: "Xiaomi", aliases: ["xiaomi", "mi"], domain: "mi.com", category: "Technology", country: "🇨🇳 China", tier: 2, hints: ["Chinese smartphone maker nicknamed 'the Apple of China'."] },
  { name: "Huawei", aliases: ["huawei"], domain: "huawei.com", category: "Technology", country: "🇨🇳 China", tier: 2, hints: ["Chinese telecom giant and world's largest 5G equipment maker."] },
  { name: "Oracle", aliases: ["oracle"], domain: "oracle.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["World's largest enterprise database software company."] },
  { name: "Salesforce", aliases: ["salesforce"], domain: "salesforce.com", category: "Technology", country: "🇺🇸 USA", tier: 2, hints: ["Pioneered cloud-based CRM software from 1999."] },
  { name: "Notion", aliases: ["notion"], domain: "notion.so", category: "Productivity", country: "🇺🇸 USA", tier: 2, hints: ["All-in-one workspace app for notes, docs and project management."] },
  { name: "Binance", aliases: ["binance"], domain: "binance.com", category: "Crypto", country: "🇨🇾 Cyprus", tier: 2, hints: ["World's largest cryptocurrency exchange by trading volume."] },
  { name: "Booking.com", aliases: ["booking", "booking.com"], domain: "booking.com", category: "Travel", country: "🇳🇱 Netherlands", tier: 2, hints: ["World's largest online hotel and accommodation booking platform."] },
  { name: "Expedia", aliases: ["expedia"], domain: "expedia.com", category: "Travel", country: "🇺🇸 USA", tier: 2, hints: ["Major American online travel agency that also owns Hotels.com."] },
  { name: "TripAdvisor", aliases: ["tripadvisor", "trip advisor"], domain: "tripadvisor.com", category: "Travel", country: "🇺🇸 USA", tier: 2, hints: ["Travel review platform with the owl as their mascot."] },
  { name: "Marvel", aliases: ["marvel", "marvel comics"], domain: "marvel.com", category: "Entertainment", country: "🇺🇸 USA", tier: 2, hints: ["Home of Iron Man, Spider-Man and the Avengers — now part of Disney."] },
  { name: "DC Comics", aliases: ["dc", "dc comics"], domain: "dccomics.com", category: "Entertainment", country: "🇺🇸 USA", tier: 2, hints: ["Home of Batman, Superman and Wonder Woman — Marvel's biggest rival."] },
  { name: "Warner Bros", aliases: ["warner bros", "wb"], domain: "warnerbros.com", category: "Entertainment", country: "🇺🇸 USA", tier: 2, hints: ["Hollywood studio famous for Harry Potter, Batman and Looney Tunes."] },
  { name: "Universal", aliases: ["universal", "universal pictures", "universal studios"], domain: "universalpictures.com", category: "Entertainment", country: "🇺🇸 USA", tier: 2, hints: ["Hollywood studio with a rotating globe as their logo — the oldest in Hollywood."] },
  { name: "ESPN", aliases: ["espn"], domain: "espn.com", category: "Sports Media", country: "🇺🇸 USA", tier: 2, hints: ["World's largest sports media network, owned by Disney."] },
  { name: "NBA", aliases: ["nba", "national basketball association"], domain: "nba.com", category: "Sports", country: "🇺🇸 USA", tier: 2, hints: ["Top professional basketball league in the world."] },
  { name: "UEFA", aliases: ["uefa"], domain: "uefa.com", category: "Sports", country: "🇨🇭 Switzerland", tier: 2, hints: ["Governing body of European football and organizers of the Champions League."] },
  { name: "FIFA", aliases: ["fifa"], domain: "fifa.com", category: "Sports", country: "🇨🇭 Switzerland", tier: 2, hints: ["Global governing body of football, organizes the World Cup."] },
  { name: "Red Cross", aliases: ["red cross", "international red cross"], domain: "icrc.org", category: "Humanitarian", country: "🇨🇭 Switzerland", tier: 2, hints: ["Oldest and most recognized humanitarian organization in the world."] },
  { name: "WWF", aliases: ["wwf", "world wildlife fund", "world wide fund"], domain: "wwf.org", category: "Environmental", country: "🇨🇭 Switzerland", tier: 2, hints: ["Environmental organization whose logo is a giant panda."] },
];

// ── TIER 3 — Supplemented from logo.dev search API at runtime ────────────────
// (populated by loadDynamicBrands)

export const HARDCODED_BRANDS: LogoBrand[] = [...T1, ...T2];

// Search terms used to fetch additional brands from logo.dev API
export const LOGO_SEARCH_TERMS = [
  "bank", "insurance", "airline", "hotel", "pharmacy", "university",
  "supermarket", "telecom", "energy", "construction", "mining", "steel",
  "chemical", "agricultural", "logistics", "shipping", "fintech", "crypto",
  "gaming", "streaming", "media", "publishing", "news", "radio",
  "hospital", "clinic", "biotech", "medical", "healthcare", "dental",
  "architecture", "engineering", "consulting", "law", "audit", "accounting",
  "ecommerce", "marketplace", "platform", "saas", "cloud", "security",
  "artificial intelligence", "robotics", "aerospace", "defense",
  "furniture", "appliance", "electronics", "hardware", "tools",
  "cosmetics", "beauty", "skincare", "fragrance", "hair",
  "restaurant", "bakery", "coffee", "beer", "wine", "spirits", "water",
  "sport", "fitness", "yoga", "cycling", "running", "swimming",
  "movie", "music", "podcast", "social", "dating", "travel", "booking",
];

// ── MongoDB-backed cache ─────────────────────────────────────────────────────
// Brands are fetched once from logo.dev API then stored in MongoDB.
// Subsequent startups load from MongoDB — no API call needed.
// Cache TTL: 7 days.

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function loadBrandsWithCache(publicKey: string): Promise<LogoBrand[]> {
  // lazy-import to avoid circular dependency at module load time
  const { logoBrandsCacheCol } = await import("../lib/db.js");

  if (logoBrandsCacheCol) {
    try {
      const cached = await logoBrandsCacheCol.findOne({ _id: "logo_brands" });
      if (cached && (Date.now() - cached.updatedAt.getTime()) < CACHE_TTL_MS) {
        return cached.brands as LogoBrand[];
      }
    } catch {
      // ignore cache read errors — fall through to API
    }
  }

  // Cache miss or stale → fetch from API
  const fresh = await loadDynamicBrands(publicKey);

  if (logoBrandsCacheCol && fresh.length > 0) {
    try {
      await logoBrandsCacheCol.updateOne(
        { _id: "logo_brands" },
        { $set: { brands: fresh as unknown[], updatedAt: new Date() } },
        { upsert: true },
      );
    } catch {
      // ignore cache write errors
    }
  }

  return fresh;
}

export async function loadDynamicBrands(publicKey: string): Promise<LogoBrand[]> {
  const seen = new Set<string>(HARDCODED_BRANDS.map((b) => b.domain.toLowerCase()));
  const results: LogoBrand[] = [];

  const batchSize = 5;
  for (let i = 0; i < LOGO_SEARCH_TERMS.length; i += batchSize) {
    const batch = LOGO_SEARCH_TERMS.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (term) => {
        try {
          const url = `https://api.logo.dev/search?q=${encodeURIComponent(term)}&token=${publicKey}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) return;
          const data = await res.json() as Array<{ name?: string; domain?: string }>;
          for (const item of data) {
            if (!item.name || !item.domain) continue;
            const domain = item.domain.toLowerCase();
            if (seen.has(domain)) continue;
            seen.add(domain);
            results.push({
              name: item.name,
              aliases: [item.name.toLowerCase()],
              domain: item.domain,
              category: "Brand",
              country: "🌍",
              tier: 3,
              hints: [],
            });
          }
        } catch {
          // silently skip failed searches
        }
      })
    );
    // small delay between batches to avoid rate limiting
    if (i + batchSize < LOGO_SEARCH_TERMS.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
