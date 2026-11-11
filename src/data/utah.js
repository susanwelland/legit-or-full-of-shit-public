// Utah, Nov 3 2026 general election. Every quote and record carries its own source.
// kind: "official" = government record opened directly, "press" = news report,
// "tracker" = third-party vote tracker (confirm against le.utah.gov before launch).
import { rollCalls, sitting } from "./utahLegislature.js";
import { ballot as STATE_BALLOT } from "./utahBallot.js";
import { said as MORE_SAID, noAnswer as NO_ANSWER } from "./utahSaid.js";

const BALLOT_STATE = {
  label: "Utah candidate filings (vote.utah.gov)",
  url: "https://vote.utah.gov/2026-candidate-filings/",
};
const BALLOT_GRAND = {
  label: "Grand County candidate list (Moab Sun News)",
  url: "https://moabsunnews.com/2026/06/16/grand-county-2026-election-candidates/",
};
const FORUM = "https://moabsunnews.com/2026/10/01/kzmu-candidate-forum-2026-transcript/";
const HB328 = "https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2026GS&voteid=513&house=H";
const HCR9H = "https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2026GS&voteid=1093&house=H";
const HCR9S = "https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2026GS&voteid=2047&house=S";
const HB247 = "https://le.utah.gov/DynaBill/svotes.jsp?sessionid=2026GS&voteid=1490&house=H";
// Official bill pages. Every vote below links its own roll call instead.
const HB507 = "https://le.utah.gov/~2026/bills/static/HB0507.html";
const HB76 = "https://le.utah.gov/~2026/bills/static/HB0076.html";
const SB132 = "https://le.utah.gov/~2025/bills/static/SB0132.html";
// Official roll calls.
const RC = (k) => rollCalls[k].url;
const voteOf = (k, rollName) => ["Yea", "Nay", "Absent"].find((v) => (rollCalls[k][v] || []).includes(rollName));

// Public records requests. status: drafted | filed | received | denied | appealed.
// When records arrive, add them to the person's `did` list with kind: "records".
const GRAND_RELEASE = "/records/grand-county/";
const GRAND_ALPR_REQUEST = {
  agency: "Grand County Sheriff's Office",
  status: "received",
  filed: "Oct 6, 2026",
  received: "Oct 7, 2026",
  ref: "Sent by email to the Grand County Clerk, who confirmed receipt and forwarded it the same day.",
  released: [
    "The office's current license plate reader policy (Policy 465)",
    "The previous version of that policy (Policy 466)",
    "A 69-page data sharing report listing the agencies the office shares license plate data with and receives it from",
  ],
  notReleased: [
    "Contracts, purchase orders or invoices",
    "Any audit or review",
    "Data-sharing agreements (the report lists agencies, not agreements)",
    "Monthly search counts or case numbers",
  ],
  asked: [
    "License plate reader contracts, purchase orders and invoices since 2023",
    "The office's license plate reader policy",
    "Any audit or review of its license plate reader use since 2025, with the office's response",
    "Data-sharing agreements with other agencies",
    "Monthly search counts and the case numbers entered for searches, 2025 to now",
  ],
  law: "Utah law gives an agency 10 business days to respond, or 5 if a faster answer benefits the public.",
  letter: "records-requests/grand-county-sheriff-alpr.md",
};

const BALLOT_SLCO = {
  label: "Salt Lake County Clerk general election posting",
  url: "https://www.saltlakecounty.gov/globalassets/1-site-files/clerk/elections/notices--petitions/2026/uocava-posting---general-updated.pdf",
};
const SLCO_RELEASE = "/records/salt-lake-county/";
const SLCO_RECEIVED = "Oct 16, 2026";
const SLCO_SHERIFF_REQUEST = {
  agency: "Salt Lake County Sheriff's Office",
  status: "received",
  filed: "Oct 6, 2026",
  received: SLCO_RECEIVED,
  ref: "Salt Lake County request no. 26-3072. With the release, the county said its Law Enforcement Division was formed July 1, 2024, so earlier records sit with the Unified Police Department. It offered either a list of the agencies that signed the data-sharing agreement or copies of the signed agreements.",
  released: [
    "The office's license plate reader policy (Policy 703)",
    "Its search and seizure policy (Policy 306)",
    "A blank Vigilant Solutions template for license plate data-sharing agreements, with no agencies filled in",
  ],
  notReleased: [
    "Contracts, purchase orders or invoices",
    "A drone policy, or drone purchases and contracts",
    "Any audit of license plate reader use",
    "Signed data-sharing agreements naming other agencies",
    "Monthly counts of license plate searches or drone flights",
  ],
  asked: [
    "License plate reader contracts, purchase orders and invoices since 2023",
    "Drone purchases, contracts and the office's drone policy since 2023",
    "The office's license plate reader policy and any audit of its use since 2025",
    "Data-sharing agreements with other agencies",
    "Monthly counts of license plate searches and drone flights, 2025 to now",
  ],
  law: "Utah law gives an agency 10 business days to respond, or 5 if a faster answer benefits the public.",
  letter: "records-requests/salt-lake-county-sheriff-alpr-drones.md",
};
const SLCO_TALLY = `Released by Salt Lake County ${SLCO_RECEIVED}, in answer to this site's records request`;
const SLCO_FLOCK_RECORDS = [
  {
    measure: "License plate reader policy 703",
    motion:
      'States: "Reasonable suspicion or probable cause is not required before using an ALPR." and "Such ALPR data may be released to other authorized and verified law enforcement officials and agencies at any time for legitimate law enforcement purposes." On audits: "ALPR system audits should be conducted on a regular basis." It sets no time limit for keeping the data; it says data moves to the office server at least every 30 days.',
    hit: "Reasonable suspicion or probable cause is not required before using an ALPR.",
    date: "Policy file dated Aug 5, 2026",
    vote: "Office policy",
    tally: SLCO_TALLY,
    url: SLCO_RELEASE + "2026-10-16_alpr-policy-703.pdf",
    kind: "records",
  },
  {
    measure: "License plate data-sharing agreement (blank template)",
    motion:
      'A Vigilant Solutions template with the agency names left as placeholders ("[#AGENCYA]" and "[#AGENCYB]"). It says each agency "retains control of all information in its account" and "Each transaction is to be logged, to include a Case Number, and an audit trail created." It names no agencies the office shares with.',
    date: "Template file dated Apr 16, 2019",
    vote: "Office record",
    tally: SLCO_TALLY,
    url: SLCO_RELEASE + "2026-10-16_lpr-data-sharing-mou-template.pdf",
    kind: "records",
  },
];
const SLCO_DRONE_RECORDS = [
  {
    measure: "Search and seizure policy 306",
    motion:
      'Released in answer to a request that asked for the office\'s drone policy. It does not use the word "drone." Its section on imaging surveillance devices says a deputy may not use one to learn about activities "within a closed structure" unless there is a warrant, consented testing or training, exigent circumstances, or fresh pursuit of a felony suspect.',
    date: "Policy file dated Aug 5, 2026",
    vote: "Office policy",
    tally: SLCO_TALLY,
    url: SLCO_RELEASE + "2026-10-16_search-seizure-policy-306.pdf",
    kind: "records",
  },
];
const SLCO_CONTEXT =
  "The Sheriff's Office released two policies and a blank data-sharing template. The release did not include contracts, an audit, signed sharing agreements naming other agencies, a drone policy, or search and flight counts; the county has offered the signed agreements. Records from before July 1, 2024 are held by the Unified Police Department, according to the county. The Vigilant Solutions template is the vendor's standard form; it does not show which agencies the office actually shares with.";
// Salt Lake City Council: in office, not on the Nov 2026 ballot (city races run in odd years).
const SLC_COUNCIL = {
  off: true,
  label: "Salt Lake City Council agenda, Sept 15, 2026",
  url: "https://www.utah.gov/pmn/files/1487195.pdf",
};
const SLC_DEC9_MINUTES = "https://www.utah.gov/pmn/files/1405541.pdf";
const SLC_DEC9 = (vote, extra = "") => ({
  measure: "Budget Amendment No. 3, FY 2025-26",
  motion:
    "Adopt Ordinance 73 of 2025, approving a $666,000 Jordan River grant and a $3,249,704 homeless shelter grant, and deferring the $224,000 COPS Technology & Equipment Grant (license plate readers) to a future meeting" + extra,
  tie: "This motion put off the $224,000 license plate reader grant. It did not approve or reject it.",
  hit: "deferring the $224,000 COPS Technology & Equipment Grant (license plate readers) to a future meeting",
  date: "Dec 9, 2025",
  vote,
  tally: "Passed 5-2",
  url: SLC_DEC9_MINUTES,
  kind: "official",
});
const SLC_DEC9_CONTEXT =
  "One motion covered three grants: it approved two and put off the license plate reader grant. A no vote was a vote against that whole motion. The minutes do not record anyone's reason. No later vote on the grant or on the council's draft camera ordinance is on file here yet.";
const SLCO_MORATORIUM = "https://saltlakecounty.api.civicclerk.com/v1/Meetings/GetMeetingFileStream(fileId=10791,plainText=false)";
// The two Great Salt Lake House roll calls, used for legislators with no other entry.
const lakeVotes = (hb328, hcr9) => [
  { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: hb328, tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
  { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: hcr9, tally: "Passed 70-1, 4 not voting", url: HCR9H, kind: "official" },
];

export const issues = [
  {
    id: "flock",
    name: "Flock cameras and surveillance",
    blurb:
      "Automatic license plate readers photograph passing cars and log them in a searchable database. About 30 Utah agencies used Flock Safety cameras in 2025.",
    measures: [
      {
        id: "HB 327 (2026)",
        tie: "Rules for license plate readers and the data they collect.",
        title: "License Plate Reader Amendments",
        what: "Would have set new rules for license plate readers and the data they collect, including a shorter data retention limit. The House Law Enforcement and Criminal Justice Committee returned it to Rules on March 3, 2026 with no recorded vote. It did not pass.",
        url: "https://le.utah.gov/~2026/bills/static/HB0327.html",
      },
      {
        id: "HB 468 (2025)",
        tie: "Rules for license plate readers and the data they collect.",
        title: "Automatic License Plate Reader Amendments",
        what: "An earlier bill on the same subject from the same sponsor. Passed the House 64-2 on Feb 27, 2025, and a Senate committee recommended it 6-0-2 on March 4, 2025. No Senate floor vote is on record, and it did not become law.",
        url: "https://le.utah.gov/~2025/bills/static/HB0468.html",
      },
    ],
  },
  {
    id: "drones",
    name: "Police drones",
    blurb:
      "Police departments are sending drones to emergency calls ahead of officers. A 2026 state law changed the rule on how police can use what a drone records.",
    measures: [
      {
        id: "SB 172 (2026)",
        tie: "Changes a rule on how police can use a drone.",
        title: "Airport and Air Amendments",
        what: "Among other things, it \"amends a restriction on how law enforcement can use a drone,\" in the words of the bill's own summary. Passed the Senate 25-0 on Feb 17, 2026 and the House 64-1 on March 5, 2026. Reported signed March 18, 2026. Only the introduced text was read for this page.",
        url: "https://le.utah.gov/Session/2026/bills/introduced/SB0172.pdf",
      },
      {
        id: "Salt Lake City program",
        tie: "Police drones sent to emergency calls.",
        title: "Drone as first responder",
        what: "Salt Lake City police send drones to emergency calls to see a scene before officers arrive, and said in May 2026 they are expanding the program. No council vote is on file here.",
        url: "https://www.ksl.com/article/news/utah/slcpd-to-expand-drone-first-responder-program-as-it-eyes-safety-efficiency/51591757",
      },
    ],
  },
  {
    id: "lake",
    name: "Great Salt Lake",
    blurb:
      "Bills from the 2026 session on getting water to the lake, limiting outdoor water use in its basin, and asking for federal help.",
    measures: [
      {
        id: "HB 328 (2026)",
        tie: "Limits spray watering of decorative grass in new development in the lake's basin.",
        title: "Water Usage Modifications",
        what: "Restricts overhead spray irrigation on nonfunctional turf in new commercial, industrial and institutional development in the Great Salt Lake basin. Passed the House 39-29 on Feb 18, 2026. Reported to have died in the Senate without a floor vote.",
        url: HB328,
      },
      {
        id: "HCR 9 (2026)",
        tie: "Asks the federal government to help pay to restore the lake.",
        title: "Concurrent Resolution Addressing the Great Salt Lake",
        what: "Urges a federal partnership and cost-sharing to restore the lake. Passed the House 70-1 on March 3, 2026 and the Senate 26-1 on March 6, 2026.",
        url: HCR9H,
      },
      {
        id: "HB 247 (2026)",
        tie: "Sends brine shrimp royalties to a lake account for water leasing.",
        title: "Great Salt Lake Related Amendments",
        what: "Directs brine shrimp royalty revenue to a lake account for water leasing and brine shrimp projects. The House agreed to the Senate's changes 67-0 on March 6, 2026.",
        url: HB247,
      },
    ],
  },
  {
    id: "datacenters",
    name: "Data centers",
    blurb:
      "State bills on data center water reporting, incentives and power supply, plus a county pause on new data center applications.",
    measures: [
      {
        id: "HB 76 (2026)",
        tie: "Makes large new data centers report their water sources and use.",
        title: "Data Center Water Transparency Amendments",
        what: "Requires large new data centers to report their water sources and use. Passed the House 72-0 on Jan 29, 2026 and the Senate 19-5 on March 5, 2026; the House agreed to the Senate's changes 62-2 the same day. Became law March 23, 2026.",
        url: HB76,
      },
      {
        id: "HB 507 (2026)",
        tie: "Reported to limit local incentives for large data centers.",
        title: "State Coordination of Regional and Local Economic Development Projects Amendments",
        what: "Reported to limit local incentives for large data centers. Passed the House 69-1 on Feb 25, 2026; the final version passed the Senate 27-1 and the House 57-1 on March 6, 2026. Became law March 25, 2026. Read the bill text before relying on this summary.",
        url: HB507,
      },
      {
        id: "SB 132 (2025)",
        tie: "Rules for powering very large new customers, such as data centers.",
        title: "Electric Utility Amendments",
        what: "Sets rules for serving very large new electricity customers, such as data centers, under separate contracts. Passed the Senate 28-1 on March 3, 2025 and the House 71-0 on March 7, 2025.",
        url: SB132,
      },
      {
        id: "Grand County pause",
        tie: "Paused new data center applications in Grand County for 180 days.",
        title: "Temporary Land Use Regulation: Data Centers",
        what: "A 180-day pause on new data center applications in Grand County, adopted 7-0 on July 7, 2026.",
        url: "https://moabsunnews.com/2026/07/08/grand-county-commission-meeting-july-7-2026/",
      },
    ],
  },
];

// The order issues appear in: the two that started this site come first.
const ISSUE_ORDER = ["lake", "datacenters", "flock", "drones"];
issues.sort((x, y) => ISSUE_ORDER.indexOf(x.id) - ISSUE_ORDER.indexOf(y.id));

export const people = [
  {
    id: "wiggins",
    name: "Jamison Wiggins",
    party: "Unaffiliated",
    office: "Grand County Sheriff",
    status: "Incumbent",
    ballot: BALLOT_GRAND,
    entries: {
      flock: {
        said: [
          {
            text: "Moab and Grand County Sheriff's Office do not use flock cameras. License plate reader cameras are a fantastic tool if used appropriately.",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
          {
            text: "First of all, we were not audited by another county.",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum, replying to Jim Winder",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
        ],
        did: [
          {
            measure: "License plate reader policy 465 (current)",
            motion:
              'States: "Deputies will not run ALPR data prior to, or during a traffic stop unless reasonable suspicion can be articulated for an active criminal investigation." and "Any time ALPR data is used, written documentation and a case number must be completed." Sharing is limited to law enforcement or prosecutors who make a written request that is reviewed and approved.',
            date: "Policy text marked Lexipol 2026/02/12",
            vote: "Office policy",
            tally: "Released by Grand County Oct 7, 2026, in answer to this site's records request",
            url: GRAND_RELEASE + "2026-10-07_alpr-policy-465-current.pdf",
            kind: "records",
          },
          {
            measure: "License plate reader policy 466 (previous)",
            motion:
              'States: "Reasonable suspicion or probable cause is not required before using an ALPR." Lists uses including "homeland security, electronic surveillance, suspect interdiction and stolen property recovery."',
            date: "Policy text marked Lexipol 2021/05/10",
            vote: "Office policy",
            tally: "Released by Grand County Oct 7, 2026, in answer to this site's records request",
            url: GRAND_RELEASE + "2026-10-07_alpr-policy-466-previous.pdf",
            kind: "records",
          },
          {
            measure: "License plate reader data sharing report",
            motion:
              'Lists more than 1,800 agency entries nationwide that the office shares license plate detections with, some marked "Inactive". They include CBP, San Diego Sector Border Patrol, DEA, ATF, IRS Criminal Investigations and the United States Marshals Service. It lists about 1,100 agencies it receives detections from, including one listed as "ICE ERO".',
            date: "Report created June 10, 2026",
            vote: "Office record",
            tally: "Released by Grand County Oct 7, 2026, in answer to this site's records request",
            url: GRAND_RELEASE + "2026-10-07_alpr-data-sharing-report.pdf",
            kind: "records",
          },
        ],
        gap: "A sheriff does not cast votes. His record is the office's contracts, policies and audits.",
        requests: [GRAND_ALPR_REQUEST],
        context:
          'The forum transcript was machine-generated and then checked by the newsroom; the audio is the record. The sharing report comes from a system the report calls VehicleManager, and one agency on its list is "Vigilant Solutions Sales"; it is not a Flock system. The report lists who the system is set up to share with. It does not show whether any of those agencies ever searched Grand County data. The release did not include contracts, an audit or search counts.',
      },
    },
  },
  {
    id: "winder",
    name: "Jim Winder",
    party: "Unaffiliated",
    office: "Grand County Sheriff",
    status: "Challenger",
    ballot: BALLOT_GRAND,
    entries: {
      flock: {
        said: [
          {
            text: "These cameras provide some of the most incredible, enforcement opportunity that we have. And technology is only as good as its users.",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
          {
            text: "Recently, the Grand County Sheriff's Office was audited, and it was determined that a practice that they utilized in terms of using a single case number over the course of one year violated those audit principles",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
        ],
        did: [],
        gap: "No record in this office. Sheriff Wiggins disputed his account of an audit at the same forum.",
        requests: [GRAND_ALPR_REQUEST],
        context:
          "The transcript was machine-generated and then checked by the newsroom. The audio is the record.",
      },
    },
  },
  {
    id: "chevrier",
    name: "Kristen Chevrier",
    party: "Republican",
    office: "Utah House, District 54",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      flock: {
        said: [
          {
            text: "I think it's very urgent because the technology is not stopping.",
            date: "Sept 24, 2026",
            venue: "KUTV interview",
            source: "KUTV 2News",
            url: "https://kutv.com/newsletter-daily/utah-lawmaker-pushes-for-more-state-guardrails-on-automatic-license-plate-readers",
            kind: "press",
          },
        ],
        did: [
          {
            measure: "HB 327 (2026)",
            motion: "Chief sponsor",
            date: "Introduced Jan 23, 2026",
            vote: "Sponsor",
            tally: "Returned to Rules March 3 with no recorded vote. Filed as not passed March 6.",
            url: "https://pf.utleg.gov/public-web/sessions/2026GS/comreport/HB0327H02.pdf",
            kind: "official",
          },
          {
            measure: "HB 468 (2025)",
            motion: "Chief sponsor. House, final passage, 3rd reading",
            date: "Feb 27, 2025",
            vote: "Yea",
            tally: "Passed 64-2, 9 not voting. No Senate floor vote is on record; it did not become law.",
            url: RC("hb468-2025-house-889"),
            kind: "official",
          },
        ],
      },
      lake: {
        said: [],
        did: [
          {
            measure: "HB 328 (2026)",
            motion: "House, final passage, 3rd reading",
            date: "Feb 18, 2026",
            vote: "Nay",
            tally: "Passed 39-29, 7 not voting",
            url: HB328,
            kind: "official",
          },
          {
            measure: "HCR 9 (2026)",
            motion: "House, final passage, 3rd reading",
            date: "March 3, 2026",
            vote: "Yea",
            tally: "Passed 70-1, 4 not voting",
            url: HCR9H,
            kind: "official",
          },
        ],
        gap: "No quote about the lake is on file yet.",
      },
      datacenters: {
        said: [],
        did: [
          {
            measure: "HB 76 (2026)",
            motion: "House, final passage, 3rd reading",
            date: "Jan 29, 2026",
            vote: "Yea",
            tally: "Passed 72-0, 3 not voting",
            url: RC("hb76-2026-house-101"),
            kind: "official",
          },
          {
            measure: "HB 507 (2026)",
            motion: "House, final passage, 3rd reading",
            date: "Feb 25, 2026",
            vote: "Absent",
            tally: "Passed 69-1, 5 not voting",
            url: RC("hb507-2026-house-861"),
            kind: "official",
          },
        ],
        gap: "No quote about data centers is on file yet.",
      },
    },
  },
  {
    id: "wilcox",
    name: "Ryan Wilcox",
    party: "Republican",
    office: "Utah House, District 7",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      flock: {
        said: [],
        did: [
          {
            measure: "HB 327 (2026)",
            motion: "Chair, House Law Enforcement and Criminal Justice Committee. Signed the notice returning the bill to Rules.",
            date: "March 3, 2026",
            vote: "No recorded vote",
            tally: "The committee report lists no vote count.",
            url: "https://pf.utleg.gov/public-web/sessions/2026GS/comreport/HB0327H02.pdf",
            kind: "official",
          },
        ],
        gap: "No quote about license plate readers is on file yet.",
        context:
          "A chair signs committee reports on behalf of the committee. The report does not show how any member, including the chair, stood on the bill.",
      },
      lake: {
        said: [],
        did: [
          { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: "Yea", tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
          { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: "Yea", tally: "Passed 70-1, 4 not voting", url: HCR9H, kind: "official" },
        ],
        gap: "No quote about the lake is on file yet.",
      },
    },
  },
  {
    id: "welton",
    name: "Doug Welton",
    party: "Republican",
    office: "Utah House, District 65",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      drones: {
        said: [],
        did: [
          {
            measure: "SB 172 (2026)",
            motion: "House floor sponsor. House, final passage",
            date: "March 5, 2026",
            vote: "Yea",
            tally: "Passed 64-1, 10 not voting",
            url: RC("sb172-2026-house-1324"),
            kind: "official",
          },
        ],
        gap: "No quote about police drones is on file yet.",
        context:
          "SB 172 is titled Airport and Air Amendments, and the drone change is one of several in it. A vote on it was a vote on the whole bill.",
      },
    },
  },
  {
    id: "hansen",
    name: "Leah Hansen",
    party: "Republican",
    office: "Utah House, District 51",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [],
        did: [
          { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: "Nay", tally: "Passed 70-1, 4 not voting. The only nay.", url: HCR9H, kind: "official" },
          { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: "Nay", tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
          { measure: "HB 247 (2026)", motion: "House agrees to Senate changes", date: "March 6, 2026", vote: "Yea", tally: "Passed 67-0, 8 not voting", url: HB247, kind: "official" },
        ],
        gap: "No quote about the lake is on file yet.",
      },
      datacenters: {
        said: [],
        did: [
          { measure: "HB 507 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 25, 2026", vote: "Nay", tally: "Passed 69-1, 5 not voting. The only nay.", url: RC("hb507-2026-house-861"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "House, conference committee report, final passage", date: "March 6, 2026", vote: "Nay", tally: "Passed 57-1, 17 not voting. The only nay.", url: RC("hb507-2026-house-1521"), kind: "official" },
          { measure: "HB 76 (2026)", motion: "House, final passage, 3rd reading", date: "Jan 29, 2026", vote: "Yea", tally: "Passed 72-0, 3 not voting", url: RC("hb76-2026-house-101"), kind: "official" },
          { measure: "HB 76 (2026)", motion: "House agrees to Senate changes (concurrence), final passage", date: "March 5, 2026", vote: "Nay", tally: "Passed 62-2, 11 not voting", url: RC("hb76-2026-house-1314"), kind: "official" },
        ],
        gap: "No quote about data centers is on file yet.",
      },
    },
  },
  {
    id: "koford",
    name: "Jill Koford",
    party: "Republican",
    office: "Utah Senate, District 5",
    status: "Sitting House member running for Senate",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "It's the single most important lever we can pull to get water to the lake,",
            date: "Published Jan 2, 2026",
            venue: "FOX 13 News interview, about her water leasing bill",
            source: "FOX 13 via Great Salt Lake Collaborative",
            url: "https://greatsaltlakenews.org/latest-news/fox-13/heres-what-bills-the-utah-legislature-plans-to-help-the-great-salt-lake",
            kind: "press",
          },
        ],
        did: [
          { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: "Nay", tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
          { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: "Yea", tally: "Passed 70-1, 4 not voting", url: HCR9H, kind: "official" },
          { measure: "HB 247 (2026)", motion: "House agrees to Senate changes", date: "March 6, 2026", vote: "Yea", tally: "Passed 67-0, 8 not voting", url: HB247, kind: "official" },
        ],
        context:
          "The quote refers to water leasing, the subject of a separate bill she sponsored. HB 328 is about turf irrigation in new development.",
      },
      datacenters: {
        said: [
          {
            text: "There's a lot of concern, and I think it's justified.",
            date: "Article dated Jan 30 (2026 session)",
            venue: "Not stated",
            source: "The Herald Journal",
            url: "https://www.hjnews.com/news/local/utah-house-bill-76-advances-to-senate-requiring-data-centers-to-report-water-use/article_ecde31e3-8ff8-4c5c-8682-27b913c57a75.html",
            kind: "press",
          },
        ],
        did: [
          { measure: "HB 76 (2026)", motion: "Chief sponsor. House, final passage, 3rd reading", date: "Jan 29, 2026", vote: "Yea", tally: "Passed 72-0, 3 not voting", url: RC("hb76-2026-house-101"), kind: "official" },
          { measure: "HB 76 (2026)", motion: "House agrees to Senate changes (concurrence), final passage", date: "March 5, 2026", vote: "Yea", tally: "Passed 62-2, 11 not voting", url: RC("hb76-2026-house-1314"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 25, 2026", vote: "Yea", tally: "Passed 69-1, 5 not voting", url: RC("hb507-2026-house-861"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "House, conference committee report, final passage", date: "March 6, 2026", vote: "Absent", tally: "Passed 57-1, 17 not voting", url: RC("hb507-2026-house-1521"), kind: "official" },
        ],
      },
    },
  },
  {
    id: "owens",
    name: "Doug Owens",
    party: "Democratic",
    office: "Utah House, District 33",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "This is the American Dead Sea, and we need to take care of it,",
            date: "Feb 25, 2026",
            venue: "Utah News Dispatch interview",
            source: "Daily Herald (republished)",
            url: "https://www.heraldextra.com/news/2026/feb/25/lawmakers-and-conservationists-marvel-at-how-a-massive-cash-infusion-could-help-the-great-salt-lake/",
            kind: "press",
          },
        ],
        did: [
          { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: "Yea", tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
          { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: "Yea", tally: "Passed 70-1, 4 not voting", url: HCR9H, kind: "official" },
          { measure: "HB 247 (2026)", motion: "House agrees to Senate changes", date: "March 6, 2026", vote: "Yea", tally: "Passed 67-0, 8 not voting", url: HB247, kind: "official" },
        ],
      },
      datacenters: {
        said: [],
        did: [
          { measure: "HB 76 (2026)", motion: "House, final passage, 3rd reading", date: "Jan 29, 2026", vote: "Yea", tally: "Passed 72-0, 3 not voting", url: RC("hb76-2026-house-101"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 25, 2026", vote: "Yea", tally: "Passed 69-1, 5 not voting", url: RC("hb507-2026-house-861"), kind: "official" },
        ],
        gap: "No quote about data centers is on file yet.",
      },
    },
  },
  {
    id: "ward",
    name: "Ray Ward",
    party: "Republican",
    office: "Utah House, District 19",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "And it would be used for the purchase of water rights that the state has a chance to lease to go into the Great Salt Lake as well as other projects that directly benefit the brine shrimp.",
            date: "Feb 6, 2026",
            venue: "Not stated",
            source: "Davis Journal",
            url: "https://www.davisjournal.com/2026/02/06/562713/bill-protects-brine-shrimp-while-directing-water-to-the-great-salt-lake",
            kind: "press",
          },
        ],
        did: [
          { measure: "HB 247 (2026)", motion: "Sponsor. House agrees to Senate changes", date: "March 6, 2026", vote: "Yea", tally: "Passed 67-0, 8 not voting", url: HB247, kind: "official" },
          { measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", vote: "Yea", tally: "Passed 39-29, 7 not voting", url: HB328, kind: "official" },
          { measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", vote: "Yea", tally: "Passed 70-1, 4 not voting", url: HCR9H, kind: "official" },
        ],
        context: "In the quote, \"it\" is brine shrimp royalty revenue under HB 247.",
      },
    },
  },
  {
    id: "sandall",
    name: "Scott Sandall",
    party: "Republican",
    office: "Utah Senate, District 1",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "I believe we have that obligation and we have the benefit when we can reacquire those water rights to be cognizant of the fact of what the lake levels are doing,",
            date: "Jan 27, 2026",
            venue: "On the state's purchase of the US Magnesium plant",
            source: "Utah News Dispatch",
            url: "https://utahnewsdispatch.com/2026/01/27/utah-buys-us-magnesium-plant-give-more-water-to-great-salt-lake/",
            kind: "press",
          },
        ],
        did: [
          { measure: "HCR 9 (2026)", motion: "Senate, 2nd and 3rd reading under suspension of the rules", date: "March 6, 2026", vote: "Yea", tally: "Passed 26-1, 2 not voting", url: HCR9S, kind: "official" },
        ],
      },
      datacenters: {
        said: [
          {
            text: "If this ever becomes an issue that requires a vote from the Senate, I would be interested in an interview. Until then, I will watch closely to make sure any and all permits are properly vetted.",
            date: "Published July 18, 2026",
            venue: "Emailed statement on the Stratos project, after declining an interview",
            source: "KSL Investigators",
            url: "https://www.ksl.com/article/51598787/candidates-seeking-box-elder-senate-seat-weigh-in-on-controversial-stratos-project",
            kind: "press",
          },
          {
            text: "What my bill file does is allow Rocky Mountain Power to step out of that regulated monopoly space and into the competitive space and contract directly with these large loads",
            date: "Published Feb 13, 2025",
            venue: "To reporters, about SB 132",
            source: "Utah News Dispatch",
            url: "https://utahnewsdispatch.com/2025/02/13/competing-senate-bills-how-should-utah-power-new-data-centers/",
            kind: "press",
          },
        ],
        did: [
          { measure: "SB 132 (2025)", motion: "Chief sponsor. Senate, final passage, 3rd reading", date: "March 3, 2025", vote: "Yea", tally: "Passed 28-1", url: RC("sb132-2025-senate-1479"), kind: "official" },
          { measure: "SB 132 (2025)", motion: "Senate agrees to House changes, final passage", date: "March 7, 2025", vote: "Yea", tally: "Passed 27-0, 2 not voting", url: RC("sb132-2025-senate-2129"), kind: "official" },
          { measure: "HB 76 (2026)", motion: "Senate sponsor. Senate, 2nd and 3rd reading under suspension of the rules", date: "March 5, 2026", vote: "Yea", tally: "Passed 19-5, 5 not voting", url: RC("hb76-2026-senate-1845"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "Senate, 2nd and 3rd reading under suspension of the rules", date: "March 5, 2026", vote: "Yea", tally: "Passed 22-2, 5 not voting", url: RC("hb507-2026-senate-1898"), kind: "official" },
          { measure: "HB 507 (2026)", motion: "Senate, final passage of the 4th substitute", date: "March 6, 2026", vote: "Yea", tally: "Passed 27-1, 1 not voting", url: RC("hb507-2026-senate-2085"), kind: "official" },
        ],
      },
    },
  },
  {
    id: "bigler",
    name: "Claudia Bigler",
    party: "Democratic",
    office: "Utah Senate, District 1",
    status: "Challenger",
    ballot: BALLOT_STATE,
    entries: {
      datacenters: {
        said: [
          {
            text: "I am not anti-data center per se, but I would like to see more study and more regulation in place before we go all in on giant projects",
            date: "Published July 18, 2026",
            venue: "KSL Investigators interview",
            source: "KSL",
            url: "https://www.ksl.com/article/51598787/candidates-seeking-box-elder-senate-seat-weigh-in-on-controversial-stratos-project",
            kind: "press",
          },
        ],
        did: [],
        gap: "No voting record. She has not held this office.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Interview", quote: true, text: "I guess a provisional 'no' until more study was done, until the environmental studies had been done and there was more opportunity for public input.", date: "July 18, 2026 · asked how she would vote on the Stratos data center project", source: "KSL", url: "https://www.ksl.com/article/51598787/candidates-seeking-box-elder-senate-seat-weigh-in-on-controversial-stratos-project", kind: "press" },
        ],
      },
    },
  },
  {
    id: "quinlan",
    name: "Julie Quinlan",
    party: "Forward",
    office: "Utah Senate, District 1",
    status: "Challenger",
    ballot: BALLOT_STATE,
    entries: {
      datacenters: {
        said: [
          {
            text: "No data centers in the greater Great Salt Lake basin where the water runs to the Great Salt Lake. No data centers, no more",
            date: "Published July 18, 2026",
            venue: "KSL Investigators interview",
            source: "KSL",
            url: "https://www.ksl.com/article/51598787/candidates-seeking-box-elder-senate-seat-weigh-in-on-controversial-stratos-project",
            kind: "press",
          },
        ],
        did: [],
        gap: "No voting record. She has not held this office.",
      },
    },
  },
  {
    id: "mccurdy",
    name: "Mike McCurdy",
    party: "Republican",
    office: "Grand County Commission, District 5",
    status: "Incumbent",
    ballot: BALLOT_GRAND,
    entries: {
      datacenters: {
        said: [
          {
            text: "We all are in agreements that we don't want that within Grand County.",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
        ],
        did: [
          {
            measure: "Grand County pause",
            motion: "Temporary Land Use Regulation: Data Centers (180-day pause on new applications)",
            date: "July 7, 2026",
            vote: "Yea",
            tally: "Passed 7-0",
            url: "https://moabsunnews.com/2026/07/08/grand-county-commission-meeting-july-7-2026/",
            kind: "press",
          },
        ],
        context:
          "In the quote, \"that\" is large data centers he described as heavy power and water users. The vote was a temporary pause, not a ban. The transcript was machine-generated; the audio is the record.",
      },
    },
  },
  {
    id: "hildenbrandt",
    name: "Everett Hildenbrandt",
    party: "Unaffiliated",
    office: "Grand County Commission, District 5",
    status: "Challenger",
    ballot: BALLOT_GRAND,
    entries: {
      datacenters: {
        said: [
          {
            text: "I think there's a lot of people here who would not like to see one here. I don't think that it would do good for the tourism business.",
            date: "Sept 28, 2026",
            venue: "KZMU candidate forum",
            source: "Moab Sun News transcript",
            url: FORUM,
            kind: "press",
          },
        ],
        did: [],
        gap: "No voting record. He has not held this office.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Candidate forum", quote: true, text: "People don't want data centers in, you know, hot desert area of Utah.", date: "Sept 28, 2026 · KZMU candidate forum, transcript published Oct 1", source: "Moab Sun News transcript", url: "https://moabsunnews.com/2026/10/01/kzmu-candidate-forum-2026-transcript/", kind: "press" },
          { type: "Candidate forum", quote: true, text: "I just think that we need to be making decisions about what we wanna prioritize with data centers a little bit sooner before waiting for that to be finished because they are moving forward.", date: "Sept 28, 2026 · KZMU candidate forum, transcript published Oct 1", source: "Moab Sun News transcript", url: "https://moabsunnews.com/2026/10/01/kzmu-candidate-forum-2026-transcript/", kind: "press" },
        ],
        context: "The transcript was machine-generated; the audio is the record.",
      },
    },
  },
  {
    id: "daileyprovost",
    name: "Jen Dailey-Provost",
    party: "Democratic",
    office: "Utah House, District 22",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [],
        did: lakeVotes("Yea", "Yea"),
        gap: "No quote about the lake is on file yet.",
      },
    },
  },
  {
    id: "nguyen",
    name: "Hoang Nguyen",
    party: "Democratic",
    office: "Utah House, District 23",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "This change will help water suppliers account for water that's committed to (the) Great Salt Lake in the development and implementation of conservation goals and strategies.",
            date: "January 2026",
            venue: "House Natural Resources, Agriculture, and Environment Committee, on HB 296",
            source: "Utah News Dispatch via Yahoo News",
            url: "https://www.yahoo.com/news/articles/bill-allowing-conserved-water-flow-032709408.html",
            kind: "press",
          },
        ],
        did: lakeVotes("Yea", "Yea"),
        context: "The quote is about HB 296, a separate water conservation bill she presented. The words in parentheses were added by the news outlet.",
      },
    },
  },
  {
    id: "gmiller",
    name: "Grant Amjad Miller",
    party: "Democratic",
    office: "Utah House, District 24",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [],
        did: lakeVotes("Yea", "Yea"),
        gap: "No quote about the lake is on file yet.",
      },
    },
  },
  {
    id: "romero",
    name: "Angela Romero",
    party: "Democratic",
    office: "Utah House, District 25",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [],
        did: lakeVotes("Yea", "Yea"),
        gap: "No quote about the lake is on file yet.",
      },
    },
  },
  {
    id: "macpherson",
    name: "Matt MacPherson",
    party: "Republican",
    office: "Utah House, District 26",
    status: "Incumbent",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [],
        did: lakeVotes("Nay", "Yea"),
        gap: "No quote about the lake is on file yet.",
      },
    },
  },
  {
    id: "gill",
    name: "Sim Gill",
    party: "Democratic",
    office: "Salt Lake County District Attorney",
    status: "Incumbent",
    ballot: BALLOT_SLCO,
    entries: {
      flock: {
        said: [
          {
            text: "I've got to really have a compelling reason why I should be able to look at that. And I think a warrant requirement certainly is a good way.",
            date: "Published Aug 13, 2026",
            venue: "KUER interview on license plate reader data",
            source: "KUER",
            url: "https://www.kuer.org/politics-government/2026-08-13/license-plate-camera-data-salt-lake-city-police-cases",
            kind: "press",
          },
        ],
        did: [],
        gap: "A district attorney does not cast votes. No office policy on using license plate data in cases is matched here yet.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Interview", quote: true, text: "And I think a warrant requirement certainly is a good way.", date: "Aug 13, 2026 · asked whether a warrant should be required for license plate data", source: "KUER", url: "https://www.kuer.org/politics-government/2026-08-13/license-plate-camera-data-salt-lake-city-police-cases", kind: "press" },
        ],
        context: "The two sentences appear back to back in the article, each attributed to him.",
      },
    },
  },
  {
    id: "kdavis",
    name: "Kent Davis",
    party: "Republican",
    office: "Salt Lake County District Attorney",
    status: "Challenger",
    ballot: BALLOT_SLCO,
    entries: {
      flock: { said: [], did: [], gap: "No quote or record about license plate readers is on file yet." },
    },
  },
  {
    id: "rivera",
    name: "Rosie Rivera",
    party: "Democratic",
    office: "Salt Lake County Sheriff",
    status: "Incumbent",
    ballot: BALLOT_SLCO,
    entries: {
      flock: {
        said: [],
        did: SLCO_FLOCK_RECORDS,
        gap: "A sheriff does not cast votes. Her record is the office's contracts, policies and audits.",
        requests: [SLCO_SHERIFF_REQUEST],
        context: SLCO_CONTEXT,
      },
      drones: {
        said: [],
        did: SLCO_DRONE_RECORDS,
        gap: "No quote about drones is on file yet.",
        requests: [SLCO_SHERIFF_REQUEST],
      },
    },
  },
  {
    id: "manwaring",
    name: "Shane Manwaring",
    party: "Republican",
    office: "Salt Lake County Sheriff",
    status: "Challenger",
    ballot: BALLOT_SLCO,
    entries: {
      flock: { said: [], did: [], gap: "No quote is on file yet, and no record in this office.", requests: [SLCO_SHERIFF_REQUEST] },
      drones: { said: [], did: [], gap: "No quote is on file yet, and no record in this office.", requests: [SLCO_SHERIFF_REQUEST] },
    },
  },
  {
    id: "mcadams",
    name: "Ben McAdams",
    party: "Democratic",
    office: "U.S. House, District 1",
    status: "Candidate",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "There's no issue more important to the future of Utah than the air we breathe, the place we call home, than saving this lake,",
            date: "Sept 29, 2026",
            venue: "Utah Debate Commission debate, Salt Lake Community College",
            source: "The Daily Utah Chronicle",
            url: "https://dailyutahchronicle.com/2026/09/30/ben-mcadams-and-riley-owen-meet-for-cd1-debate/",
            kind: "press",
          },
        ],
        did: [],
        gap: "No vote on a 2024 to 2026 Great Salt Lake measure is matched here. He was not in office for them.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Interview", quote: true, text: "We have to see that this transformative technology is lifting everyday Utahns, and we need to have standards in place that protect our air quality and protect the Great Salt Lake.", date: "June 1, 2026 · candidate profile interview", source: "KUER", url: "https://www.kuer.org/politics-government/2026-06-01/2026-democrat-primary-cd1-candidate-profile-ben-mcadams", kind: "press" },
          { type: "Interview", quote: true, text: "And I think the Great Salt Lake's a good issue that is going to be bipartisan.", date: "June 1, 2026 · candidate profile interview", source: "KUER", url: "https://www.kuer.org/politics-government/2026-06-01/2026-democrat-primary-cd1-candidate-profile-ben-mcadams", kind: "press" },
        ],
      },
    },
  },
  {
    id: "owen",
    name: "Riley Owen",
    party: "Republican",
    office: "U.S. House, District 1",
    status: "Candidate",
    ballot: BALLOT_STATE,
    entries: {
      lake: {
        said: [
          {
            text: "water markets, not regulated forced buybacks, but leases from willing users who are willing to sell that back into the lake.",
            date: "Sept 29, 2026",
            venue: "Utah Debate Commission debate, Salt Lake Community College",
            source: "The Daily Utah Chronicle",
            url: "https://dailyutahchronicle.com/2026/09/30/ben-mcadams-and-riley-owen-meet-for-cd1-debate/",
            kind: "press",
          },
        ],
        did: [],
        gap: "No vote on a Great Salt Lake measure is matched here yet.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Campaign website", quote: true, text: "Riley will convene local stakeholders and national agencies to save the Great Salt Lake.", date: "Accessed Oct 12, 2026 · Issues page", source: "Riley Owen for Utah (campaign site)", url: "https://www.utahriley.com/issues", kind: "campaign" },
        ],
        context: "The quote is a fragment as published. He was describing what he supports.",
      },
    },
  },
  {
    id: "petro",
    name: "Victoria Petro",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 1",
    status: "In office, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: {
      flock: {
        said: [
          {
            text: "I believe in what we are building here. I believe in (Salt Lake City Police Chief Brian Redd's) leadership, and I'm proud of what we're doing. I'm not interested in us playing culture war games and penalizing the people who are in my neighborhood for the sake of some voting points that can't be made without causing people to live in fear. That's where I will be drawing the line consistently on this issue.",
            date: "Dec 9, 2025",
            venue: "City Council meeting, on the license plate reader grant",
            source: "KSL.com",
            url: "https://www.ksl.com/article/51417586/salt-lake-city-postpones-decision-on-224k-grant-amid-concerns-over-how-itll-be-used",
            kind: "press",
          },
        ],
        did: [SLC_DEC9("Aye")],
        context: SLC_DEC9_CONTEXT,
      },
    },
  },
  {
    id: "puy",
    name: "Alejandro Puy",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 2",
    status: "Council chair, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: {
      flock: {
        said: [
          {
            text: "The data needs to be well protected, and we have to have a good mechanism to audit and find misuse.",
            date: "Published Aug 4, 2026",
            venue: "Interview with Axios, about the council's draft license plate reader rules",
            source: "Axios Salt Lake City",
            url: "https://www.axios.com/local/salt-lake-city/2026/08/04/salt-lake-city-council-license-plate-readers-rules",
            kind: "press",
          },
        ],
        did: [SLC_DEC9("Aye", ". He seconded the motion")],
        context: SLC_DEC9_CONTEXT,
      },
    },
  },
  {
    id: "carlsen",
    name: "Erika Carlsen",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 5",
    status: "Council vice chair, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: {
      flock: {
        said: [
          {
            text: "I have faith in the Police Department to maintain that security of data. Multinational corporations, not so much. So I want to ensure that we are well protected in that regard.",
            date: "Published Aug 25, 2026",
            venue: "Council discussion of the draft license plate reader rules",
            source: "The Salt Lake Tribune",
            url: "https://www.sltrib.com/news/2026/08/25/flock-isnt-used-slc-utahs-capital/",
            kind: "press",
          },
        ],
        did: [],
        gap: "Her name is not in the Dec 9, 2025 roll call on the license plate reader grant. No council vote on cameras with her name is on file here yet.",
        // On the record instead of a vote: their own words, each checked word for word against the source page on Oct 12, 2026.
        record: [
          { type: "Interview", quote: true, text: "I frame this conversation as both a public safety concern, but also (it) be a concern about privacy", date: "July 28, 2026 · on the city's draft license plate reader rules", source: "KSL", url: "https://www.ksl.com/article/news/utah/counties/salt-lake/salt-lake-city-seeks-to-wrangle-in-how-automatic-license-plate-readers-are-used/51602784", kind: "press" },
        ],
        context: "The Tribune printed the quote in two parts, joined here in the order printed.",
      },
    },
  },
  {
    id: "wharton",
    name: "Chris Wharton",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 3",
    status: "In office, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: { flock: { said: [], did: [SLC_DEC9("Aye")], context: SLC_DEC9_CONTEXT } },
  },
  {
    id: "dugan",
    name: "Dan Dugan",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 6",
    status: "In office, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: { flock: { said: [], did: [SLC_DEC9("Nay")], context: SLC_DEC9_CONTEXT } },
  },
  {
    id: "young",
    name: "Sarah Young",
    party: "Nonpartisan office",
    office: "Salt Lake City Council, District 7",
    status: "In office, not on the 2026 ballot",
    ballot: SLC_COUNCIL,
    entries: { flock: { said: [], did: [SLC_DEC9("Nay")], context: SLC_DEC9_CONTEXT } },
  },
  {
    id: "jjohnson",
    name: "Jiro Johnson",
    party: "Democratic",
    office: "Salt Lake County Council, District 1",
    status: "Incumbent",
    ballot: BALLOT_SLCO,
    entries: {
      datacenters: {
        said: [],
        did: [
          {
            measure: "Resolution 26-792, with a data center moratorium added",
            hit: "a moratorium of up to 180 days on data center approvals in unincorporated Salt Lake County",
            motion:
              "Adopt the resolution on water-intensive industrial development with a new section directing a temporary ordinance: a moratorium of up to 180 days on data center approvals in unincorporated Salt Lake County. He seconded the motion",
            date: "Aug 18, 2026",
            vote: "Aye",
            tally: "Failed 4-4",
            url: SLCO_MORATORIUM,
            kind: "official",
          },
        ],
        context:
          "A second motion the same day, to have lawyers draft a 180-day data center moratorium modeled on other counties' ordinances, carried unanimously. He was present; the minutes do not list names for that vote.",
      },
    },
  },
  {
    id: "poe",
    name: "Casey Poe",
    party: "Libertarian",
    office: "Salt Lake County Council, District 1",
    status: "Challenger",
    ballot: BALLOT_SLCO,
    entries: {
      datacenters: { said: [], did: [], gap: "No quote is on file yet, and no record in this office." },
    },
  },
];

// Great Salt Lake roll calls for every candidate on the ballot who sat in the 2026 session.
// House members: HB 328 and HCR 9 in the House. Senators: HCR 9 in the Senate (HB 328 never
// reached a Senate floor vote). Read straight from the official roll calls in utahLegislature.js.
const LAKE_ROLLS = {
  House: [
    { k: "hb328-2026-house-513", measure: "HB 328 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 18, 2026", tally: "Passed 39-29, 7 not voting" },
    { k: "hcr9-2026-house-1093", measure: "HCR 9 (2026)", motion: "House, final passage, 3rd reading", date: "March 3, 2026", tally: "Passed 70-1, 4 not voting" },
  ],
  Senate: [
    { k: "hcr9-2026-senate-2047", measure: "HCR 9 (2026)", motion: "Senate, 2nd and 3rd reading under suspension of the rules", date: "March 6, 2026", tally: "Passed 26-1, 2 not voting" },
  ],
};
const lakeRecord = (s) =>
  LAKE_ROLLS[s.seat2026.includes("House") ? "House" : "Senate"].map(({ k, ...r }) => ({ ...r, vote: voteOf(k, s.rollName), url: RC(k), kind: "official" }));
const familyOf = (n) => n.toLowerCase().replace(/[^a-z ]/g, "").trim().split(" ").pop();
for (const s of sitting) {
  const filed = people.find((p) => p.office === s.office && familyOf(p.name) === familyOf(s.name));
  if (filed && filed.entries.lake) continue;
  const lake = { said: [], did: lakeRecord(s), gap: "No quote about the lake is on file yet." };
  if (filed) {
    filed.entries.lake = lake;
    continue;
  }
  const moved = s.seat2026 !== s.office;
  people.push({
    id: s.id,
    name: s.name,
    party: s.party,
    office: s.office,
    status: moved ? `Sitting ${s.seat2026.split(/[ ,]/)[1]} member running for ${s.office.split(/[ ,]/)[1]}` : "Incumbent",
    ballot: BALLOT_STATE,
    entries: { lake },
  });
}

// The other issues' roll calls for the same legislators, so "No vote on record" only shows where
// there truly is none. Read straight from the official roll calls in utahLegislature.js; a roll call
// a legislator was not in office for is left out.
const ISSUE_ROLLS = {
  datacenters: {
    House: [
      { k: "hb76-2026-house-101", measure: "HB 76 (2026)", motion: "House, final passage, 3rd reading", date: "Jan 29, 2026", tally: "Passed 72-0, 3 not voting" },
      { k: "hb76-2026-house-1314", measure: "HB 76 (2026)", motion: "House agrees to Senate changes (concurrence), final passage", date: "March 5, 2026", tally: "Passed 62-2, 11 not voting" },
      { k: "hb507-2026-house-861", measure: "HB 507 (2026)", motion: "House, final passage, 3rd reading", date: "Feb 25, 2026", tally: "Passed 69-1, 5 not voting" },
      { k: "hb507-2026-house-1521", measure: "HB 507 (2026)", motion: "House, conference committee report, final passage", date: "March 6, 2026", tally: "Passed 57-1, 17 not voting" },
      { k: "sb132-2025-house-1508", measure: "SB 132 (2025)", motion: "House, final passage", date: "March 7, 2025", tally: "Passed 71-0, 4 not voting" },
    ],
    Senate: [
      { k: "hb76-2026-senate-1845", measure: "HB 76 (2026)", motion: "Senate, 2nd and 3rd reading under suspension of the rules", date: "March 5, 2026", tally: "Passed 19-5, 5 not voting" },
      { k: "hb507-2026-senate-1898", measure: "HB 507 (2026)", motion: "Senate, 2nd and 3rd reading under suspension of the rules", date: "March 5, 2026", tally: "Passed 22-2, 5 not voting" },
      { k: "hb507-2026-senate-2085", measure: "HB 507 (2026)", motion: "Senate, final passage of the 4th substitute", date: "March 6, 2026", tally: "Passed 27-1, 1 not voting" },
      { k: "sb132-2025-senate-1479", measure: "SB 132 (2025)", motion: "Senate, final passage, 3rd reading", date: "March 3, 2025", tally: "Passed 28-1" },
      { k: "sb132-2025-senate-2129", measure: "SB 132 (2025)", motion: "Senate agrees to House changes, final passage", date: "March 7, 2025", tally: "Passed 27-0, 2 not voting" },
    ],
  },
  flock: {
    House: [
      { k: "hb468-2025-house-889", measure: "HB 468 (2025)", motion: "House, final passage, 3rd reading", date: "Feb 27, 2025", tally: "Passed 64-2, 9 not voting. No Senate floor vote is on record; it did not become law." },
    ],
    Senate: [],
  },
  drones: {
    House: [{ k: "sb172-2026-house-1324", measure: "SB 172 (2026)", motion: "House, final passage", date: "March 5, 2026", tally: "Passed 64-1, 10 not voting" }],
    Senate: [
      { k: "sb172-2026-senate-496", measure: "SB 172 (2026)", motion: "Senate floor vote", date: "Feb 13, 2026", tally: "Passed 26-0, 3 not voting" },
      { k: "sb172-2026-senate-545", measure: "SB 172 (2026)", motion: "Senate floor vote", date: "Feb 17, 2026", tally: "Passed 25-0, 4 not voting" },
    ],
  },
};
const ISSUE_GAP = {
  datacenters: "No quote about data centers is on file yet.",
  flock: "No quote about license plate cameras is on file yet.",
  drones: "No quote about police drones is on file yet.",
};
const ISSUE_CONTEXT = {
  drones: "SB 172 is titled Airport and Air Amendments, and the drone change is one of several in it. A vote on it was a vote on the whole bill.",
};
const SENATE_GAP = {
  flock: "No Senate vote on this is on file: HB 468 never got a Senate floor vote, and HB 327 died in House Rules.",
};
for (const s of sitting) {
  const p = people.find((x) => x.id === s.id) || people.find((x) => x.office === s.office && familyOf(x.name) === familyOf(s.name));
  if (!p) continue;
  const chamber = s.seat2026.includes("House") ? "House" : "Senate";
  for (const [issue, rolls] of Object.entries(ISSUE_ROLLS)) {
    const have = p.entries[issue];
    if (have && have.did.length) continue; // a hand-checked file already has its votes
    const did = rolls[chamber]
      .map(({ k, ...r }) => ({ ...r, vote: voteOf(k, s.rollName), url: RC(k), kind: "official" }))
      .filter((r) => r.vote);
    const entry = have || { said: [], did: [], gap: ISSUE_GAP[issue] };
    entry.did = did;
    if (!did.length && chamber === "Senate" && SENATE_GAP[issue]) entry.gap = SENATE_GAP[issue];
    if (did.length && ISSUE_CONTEXT[issue] && !entry.context) entry.context = ISSUE_CONTEXT[issue];
    p.entries[issue] = entry;
  }
}

// Checked quotes from utahSaid.js. Someone on the ballot who has no file yet gets one.
const INCUMBENT = new Set(["b-blake-d-moore-u-s-house-2", "b-celeste-maloy-u-s-house-3", "b-mike-kennedy-u-s-house-4"]);
for (const { personId, issue, note, ...q } of MORE_SAID) {
  let p = people.find((x) => x.id === personId);
  if (!p) {
    const b = STATE_BALLOT.find((x) => x.id === personId);
    if (!b) continue;
    p = { id: b.id, name: b.name, party: b.party, office: b.office, status: INCUMBENT.has(b.id) ? "Incumbent" : "Candidate", ballot: BALLOT_STATE, entries: {} };
    people.push(p);
  }
  const entry = p.entries[issue] || (p.entries[issue] = { said: [], did: [] });
  if (!entry.did.length && /^U\.S\. House/.test(p.office) && !entry.gap)
    entry.gap = "The measures on this page were decided by the Utah Legislature and local governments, not Congress.";
  entry.said.push(note ? { ...q, note } : q);
}

// A candidate questionnaire they did not answer, as the publisher's page states it.
for (const { personId, ...n } of NO_ANSWER) {
  const p = people.find((x) => x.id === personId);
  if (p) p.noAnswer = n;
}
