// "Tell me when my state opens": the issues a visitor can pick. The server reads this same list
// (server/sync-data.mjs copies it) and keeps only these.
export const SIGNUP_ISSUES = ["Water and drought", "Cost of housing", "Data centers and power", "Police and surveillance", "Taxes and spending", "Schools", "Public lands", "Corruption and ethics"];

export const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "Washington, D.C.", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Shown next to the phone box and stored with each text follower, word for word.
export const TEXT_CONSENT =
  "I agree to get text messages from Legit or Full of Shit when something new is added to the files of people I follow. Message frequency varies. Message and data rates may apply. Reply STOP to stop.";
