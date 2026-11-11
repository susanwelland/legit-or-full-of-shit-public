// Where to write to each person. Only addresses read on a public page are listed; `source` is that page.
// kind: "office" = the official address for the office they hold, "campaign" = published by the campaign.
// With no confirmed address, `page` points to the best official or campaign contact page.
const LEG = "https://le.utah.gov/data/legislators.json";
const PAMPHLET = "https://www.utah.gov/pmn/files/1494271.pdf";
export const contacts = {
  wilcox: { email: "ryanwilcox@le.utah.gov", kind: "office", source: LEG },
  koford: { email: "jkoford@le.utah.gov", kind: "office", source: LEG },
  owens: { email: "dougowens@le.utah.gov", kind: "office", source: LEG },
  ward: { email: "rayward@le.utah.gov", kind: "office", source: LEG },
  daileyprovost: { email: "jdprovost@le.utah.gov", kind: "office", source: LEG },
  nguyen: { email: "hnguyen@le.utah.gov", kind: "office", source: LEG },
  gmiller: { email: "gmiller@le.utah.gov", kind: "office", source: LEG },
  romero: { email: "angelaromero@le.utah.gov", kind: "office", source: LEG },
  macpherson: { email: "mmacpherson@le.utah.gov", kind: "office", source: LEG },
  sandall: { email: "ssandall@le.utah.gov", kind: "office", source: "https://brag.utah.gov/utah-senators-representatives-congressional-staff/" },
  chevrier: { email: "Kristen@KristenForUtah.com", kind: "campaign", source: "https://www.kristenforutah.com/" },
  welton: { email: "doug@dougweltonutah.com", kind: "campaign", source: PAMPHLET },
  hansen: { email: "leahforutah@gmail.com", kind: "campaign", source: PAMPHLET },
  mcadams: { email: "info@benmcadamsutah.com", kind: "campaign", source: PAMPHLET },
  owen: { email: "info@utahriley.com", kind: "campaign", source: PAMPHLET },
  mccurdy: { email: "mmccurdy@grandcountyutah.net", kind: "office", source: "https://grandcountyutah.net/directory.aspx?EID=311" },
  gill: { email: "DistrictAtty@saltlakecounty.gov", kind: "office", source: "https://www.saltlakecounty.gov/district-attorney/contact" },
  wiggins: { page: "https://grandcountyutah.net/240/Sheriff", pageLabel: "Grand County Sheriff's Office page" },
  winder: { page: "https://winderforsheriff.com/", pageLabel: "campaign site" },
  hildenbrandt: { page: "https://everettforgrand.com/", pageLabel: "campaign site" },
  quinlan: { page: "https://www.julieq4utah.com/", pageLabel: "campaign site" },
  rivera: { page: "https://prod.saltlakecounty.gov/sheriff/contact/", pageLabel: "Salt Lake County Sheriff's Office contact page" },
  bigler: {},
  kdavis: {},
  manwaring: {},
};
