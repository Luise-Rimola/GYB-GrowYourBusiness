/**
 * Startup consulting insights for analysis and planning.
 * Used in context pack so workflows can reference funding and incorporation options.
 */

export const fundingModels = {
  title: "Select the Best Funding Model for Your Project",
  categories: [
    {
      name: "Non-dilutive",
      methods: ["Grants", "Credits", "NFT Sale"],
      description: "No equity given up; often government, EU, or innovation grants.",
    },
    {
      name: "Traditional",
      methods: ["Venture Capital", "Business Angels", "Crowdfunding", "Venture Debt"],
      description: "Equity or debt-based; established startup financing.",
    },
    {
      name: "Token",
      methods: ["ICO", "IDO", "Fair launch", "Venture Staking"],
      description: "Web3 / crypto-native funding; token-based economics.",
    },
  ],
};

export const incorporationModels = {
  title: "Select the Best Incorporation Model for Your Project",
  categories: [
    {
      name: "Profit / non-profit",
      options: {
        "For-profit": ["Ltd", "C-Corp", "GmbH", "Plc"],
        "Non-profit": ["Association", "Foundation"],
      },
      description: "Choose entity type based on profit distribution and mission.",
    },
    {
      name: "Centralized or Decentralized",
      options: {
        Decentralized: ["DAO"],
        Centralized: ["Real World Entity"],
      },
      additional: ["anonymous/KYC"],
      description: "Governance structure; DAO for community-led, RWE for traditional.",
    },
    {
      name: "Incorporation Type",
      jurisdictions: [
        "US Delaware C-Corp",
        "Swiss Association",
        "UK Ltd",
        "Singapore PLC",
        "BVI + Offshore",
      ],
      description: "Jurisdiction affects tax, regulation, and investor expectations.",
    },
  ],
};

export const termProjects = {
  title: "Term Project Tracks",
  description: "Structured project tracks with courses & workshops for startup consulting.",
  tracks: [
    {
      name: "Launch a Consumer Brand",
      description: "Identify your product, define market fit, and craft a compelling go-to-market strategy.",
      targets: ["5 SKUs", "$20,000 in revenue"],
      courses_workshops: [
        "How to decode market trends to build your next startup?",
        "How to add GPT into your startup's founding team?",
        "How to brand for Gen Z and Gen Alpha?",
        "How to procure, ship, and run a supply chain from your dorm room?",
        "How to build the next super app?",
        "How to design a go-to-market strategy that actually works?",
        "How to pitch, persuade, and inspire without sounding like a robot?",
        "How to tell if your unit economics are lying to you?",
        "How to prove ROI on your marketing budget?",
        "How to turn waste into profit with circular business models?",
        "How to invest like Warren Buffet?",
        "How to build a winning team from day one?",
        "How to launch global brands in Dubai's luxury market?",
        "How to design brands for a multicultural world?",
        "How to build a smart city the Dubai way?",
        "How to design innovation districts that shape global economies?",
      ],
    },
    {
      name: "Scale a Product Venture",
      description: "Prototype, work with manufacturers, and bring your idea to life.",
      targets: ["3 prototypes", "5 factory negotiations", "10%+ profit margin"],
      courses_workshops: [
        "How to beat Tesla at its own game?",
        "How to build products people can't live without?",
        "How to build and scale a business with AI?",
        "How to build the factory of the future?",
        "How to negotiate across cultures and languages?",
        "How to make products at the speed of Shenzhen?",
        "How to modernize supply chains the Amazon way?",
        "How to adapt product and pricing for a billion different customers?",
        "How to decide when to build, partner, or buy?",
        "How to turn entertainment into shopping the WeChat way?",
        "How to build the world's biggest digital marketplaces the Alibaba way?",
        "How to build and scale gaming ecosystems in a billion-user market?",
        "How to use AI to power player analytics from FIFA to Fortnite?",
      ],
    },
    {
      name: "Master Experience Design & Content",
      description: "Design standout experiences in food, culture, travel, and luxury; create viral content.",
      targets: ["50 videos", "20,000 followers across 2 social channels", "100 paying customers"],
      courses_workshops: [
        "How to keep customers hooked like Netflix?",
        "How to find unicorns hiding in plain sight?",
        "How to lead responsibly when policy moves faster than technology?",
        "How to lead a 100 year old company through transition?",
        "How to use AI to supercharge your productivity?",
        "How to create content like Mr. Beast?",
        "How to convince investors to bet on you?",
        "How to navigate the world of crypto and digital wallets?",
        "How to finance the transition to net zero?",
        "How to structure and finance global sports deals?",
        "How to build businesses at the intersection of sports, health, and wellness?",
        "How to scale tourism with AI and digital platforms?",
        "How to build the next generation of tourism products?",
      ],
    },
  ],
};

export const startupInsights = {
  funding_models: fundingModels,
  incorporation_models: incorporationModels,
  term_projects: termProjects,
};
