export const company = {
  name: "Independence-X Aerospace",
  tagline: "Dedicated Nano Launch Vehicle for Cubesats",
  descriptor: "NewSpace Transportation Company",
  email: "izmir.yamin@independence-x.com",
  phoneDisplay: "+6 01 2651 7438 [Mobile]",
  phoneHref: "tel:+60126517438",
};

export const offices = [
  {
    entity: "PJBUMI Technologies Sdn. Bhd.",
    registration: "201701036428 (1250599-D)",
    places: [
      {
        name: "Malaysian Office 1",
        lines: [
          "Unit 22-1 Level 22, MOF Inc. Tower,",
          "Platinum Park, No 9 Persiaran KLCC,",
          "50088 Kuala Lumpur, Malaysia",
        ],
        map: "Unit 22-1 Level 22, MOF Inc. Tower, Platinum Park, No 9 Persiaran KLCC, 50088 Kuala Lumpur, Malaysia",
        lat: 3.154218,
        lon: 101.718424,
      },
      {
        name: "Malaysian Office 2",
        lines: [
          "218, Jalan Sendayan Metropark 2/3,",
          "Sendayan Metropark,",
          "71950 Seremban,",
          "Negeri Sembilan, Malaysia",
        ],
        map: "218, Jalan Sendayan Metropark 2/3, Sendayan Metropark, 71950 Seremban, Negeri Sembilan, Malaysia",
        lat: 2.6869374,
        lon: 101.8462917,
      },
    ],
  },
  {
    entity: "PJBUMI Technologies SAS",
    registration: "RCS Toulouse 107 926 883",
    places: [
      {
        name: "French Office 1",
        lines: ["13 rue Sainte Ursule 31000,", "TOULOUSE, France"],
        map: "13 rue Sainte Ursule 31000, Toulouse, France",
        lat: 43.6020813,
        lon: 1.4421109,
      },
    ],
  },
];

export const nav = [
  { href: "/", label: "Home" },
  { href: "/clients", label: "Clients" },
  { href: "/contact", label: "Contact Us" },
  { href: "/funding", label: "Funding" },
  { href: "/awards", label: "Awards" },
  { href: "/media", label: "Media" },
  { href: "/store", label: "Store" },
];

export const totals = {
  contracts: "RM6,665,985 or USD1,500,000",
  funded: "RM1,669,904 or USD375,767",
};

export const clients = [
  {
    name: "SpaceBorn United",
    country: "The Netherlands",
    image: "/media/client-nl.png",
    dark: false,
  },
  {
    name: "Samsung",
    country: "Republic of South Korea",
    image: "/media/client-samsung.png",
    dark: true,
  },
  {
    name: "Shell",
    country: "The Netherlands",
    image: "/media/client-shell.png",
    dark: false,
  },
  {
    name: "E.Nova Aerospace",
    country: "France",
    image: "/media/client-enova.png",
    dark: true,
  },
  {
    name: "Indian Technology Congress Association",
    country: "India",
    image: "/media/client-itc.jpeg",
    dark: false,
  },
  {
    name: "DALI",
    country: "Denmark",
    image: "/media/client-dk.png",
    dark: false,
  },
  {
    name: "Cochrane Exploration",
    country: "United States of America",
    image: "/media/client-cochrane.png",
    dark: true,
  },
];

export const funders = [
  {
    name: "SUPERB and TERAJU",
    amount: "RM500,000 or USD112,511",
    image: "/media/fund-superb.webp",
    dark: false,
  },
  {
    name: "Google Lunar XPRIZE",
    amount: "RM250,000 or USD56,255",
    image: "/media/fund-glxp.jpg",
    dark: true,
  },
  {
    name: "Gate to Global and MARA",
    amount: "RM20,000 or USD4,500",
    image: "/media/fund-20k.jpg",
    dark: false,
  },
  {
    name: "MATRADE",
    amount: "RM30,000 or USD6,750",
    image: "/media/fund-matrade.png",
    dark: false,
  },
  {
    name: "Ministry of Science, Technology and Innovation",
    amount: "RM70,000 or USD15,751",
    image: "/media/fund-mosti.jpg",
    dark: false,
  },
  {
    name: "Izmir Tech Industries",
    amount: "RM800,000 or USD180,000",
    image: "/media/fund-izmir.png",
    dark: false,
  },
];

export const awards = [
  {
    title: "World Technology Award 2014",
    body: "Nomination in Space Category by Time and Fortune Magazine in New York City, USA.",
    image: "/media/award-wta.png",
    alt: "2014 World Technology Award nominees page listing Mohd Izmir Yamin in the Space category",
  },
  {
    title: "Pioneer Award",
    body: "Pioneer Award by Google and X Prize Foundation in 2016 in Los Angeles, California, USA. With Cash Prize of USD55,000.",
    image: "/media/award-pioneer.png",
    alt: "Google Lunar XPRIZE Pioneer Award presented to Independence-X Aerospace",
  },
];

export const mercapFeatures = [
  {
    title: "Realtime telemetry",
    body: "Telemetry and telecommand enabled for realtime downlink and uplink.",
  },
  {
    title: "Hydrogen fuel cell",
    body: "Hydrogen fuel cell power supply sized to meet experiment demand.",
  },
  {
    title: "4 to 14 days in LEO",
    body: "Mission duration from 4 days to 14 days in circular low Earth orbit.",
  },
  {
    title: "Experiment pods",
    body: "Dedicated biotech and pharmaceutical space experiment pods.",
  },
];

export const mercapSystems = [
  "Parachute bay",
  "Adapter port",
  "Experiment bay",
  "Shock absorbing system",
  "Attitude control system",
  "Re-entry heat shield",
  "Guidance and navigation",
];

export const sequence = [
  { n: "01", phase: "Launch", label: "Launch" },
  { n: "02", phase: "Launch", label: "Stage separation" },
  { n: "03", phase: "Launch", label: "LEO deployment" },
  { n: "04", phase: "Operational", label: "Stays in orbit for 4 to 14 days" },
  { n: "05", phase: "Recovery", label: "Re-entry" },
  { n: "06", phase: "Recovery", label: "Parachute deploys" },
  { n: "07", phase: "Recovery", label: "Touchdown" },
];

export const coverage = [
  {
    kicker: "French media",
    title: "Une microcapsule malaisienne vise Toulouse",
    meta: "AeroSpatium · Stefan Barensky · 26 June 2018",
    image: "/media/media-french.png",
    alt: "AeroSpatium article about a Malaysian microcapsule aiming for Toulouse",
  },
  {
    kicker: "US media",
    title:
      "Malaysia’s Independence-X is the only Southeast Asian team in Google Lunar XPrize",
    meta: "CNBC · Nyshka Chandran · 8 December 2016",
    image: "/media/media-us.png",
    alt: "CNBC article on Independence-X and the Google Lunar XPrize",
  },
  {
    kicker: "German media",
    title: "Team Independence-X Aerospace",
    meta: "GEO · April 2017",
    image: "/media/media-german.png",
    alt: "GEO magazine feature on Team Independence-X Aerospace",
  },
  {
    kicker: "News channel interview",
    title: "Izmir Yamin, Independence-X Aerospace CEO",
    meta: "Bloomberg TV",
    image: "/media/media-news.png",
    alt: "Bloomberg TV interview with Izmir Yamin",
  },
  {
    kicker: "Singaporean media",
    title: "Interview: Independence-X, Malaysia’s NewSpace pioneer",
    meta: "Deyana Goh · 25 April 2018",
    image: "/media/media-singapore.png",
    alt: "Interview feature on Independence-X as a NewSpace pioneer",
  },
];
