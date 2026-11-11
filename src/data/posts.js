// Blog posts. Blocks: p (paragraph), h (heading), list, quote, letter (a key in letters.js).
export const posts = [
  {
    id: "why-i-built-this",
    title: "Why I built this",
    date: "October 6, 2026",
    dek: "I love Salt Lake City. I was also voting blind.",
    blocks: [
      { p: "I love Salt Lake City. But every year I felt like I was getting the shaft, and I didn't know how to find out which politicians and representatives I could trust. I was judging a book by its cover." },
      { p: "Then came the Great Salt Lake and the data centers. The lake keeps shrinking. Data centers that use a great deal of power and water keep getting proposed. Both are decided by people whose names are on my ballot, and I could not have told you how a single one of them had voted." },
      { p: "I knew I needed to truly know who I was voting for. So this is the solution." },
      { h: "How it works" },
      { list: [
        "Pick an issue, then pick a candidate.",
        "Read what they said, word for word, next to what they did: the votes, the bills, the records.",
        "Every line links to its source. Where something is missing, the page says so.",
        "Then you make the call: legit, or full of shit.",
      ] },
      { p: "The site does not tell you who to vote for, and it treats every candidate in every party the same way. I started with Utah because it is home. The plan is to take it national." },
    ],
  },
  {
    id: "sheriff-records-requests",
    title: "I asked two sheriffs for their surveillance records",
    date: "October 6, 2026",
    dek: "Sheriffs don't vote, so there is no roll call to check them against. Their record is paperwork. Today I asked for it.",
    blocks: [
      { p: "This site puts what a candidate said next to what they did. For a legislator, what they did is easy to find: every vote is published. A sheriff never casts a vote. What a sheriff does shows up in contracts, policies, audits and logs, and none of that is posted anywhere a voter can read it." },
      { p: "Utah has a law for this, the Government Records Access and Management Act, known as GRAMA. Anyone can use it to ask a government office for its records. On October 6 I sent two requests under it, to the two sheriff's offices whose races are on this site." },

      { h: "Grand County Sheriff's Office" },
      { p: "At a candidate forum on September 28, the two people running for Grand County sheriff disagreed about a basic fact. Challenger Jim Winder said the office had been audited over how it logs license plate reader searches:" },
      { quote: "Recently, the Grand County Sheriff's Office was audited, and it was determined that a practice that they utilized in terms of using a single case number over the course of one year violated those audit principles", who: "Jim Winder, KZMU candidate forum, Sept 28, 2026", url: "https://moabsunnews.com/2026/10/01/kzmu-candidate-forum-2026-transcript/" },
      { p: "Sheriff Jamison Wiggins answered:" },
      { quote: "First of all, we were not audited by another county.", who: "Sheriff Jamison Wiggins, same forum", url: "https://moabsunnews.com/2026/10/01/kzmu-candidate-forum-2026-transcript/" },
      { p: "Both statements cannot be the whole story, and I don't know which is closer. The records will say. I asked for:" },
      { list: [
        "Every license plate reader contract, purchase order and invoice since 2023",
        "The office's written policy on license plate readers",
        "Any audit or review of its license plate reader use since 2025, with the office's response",
        "Its data-sharing agreements with other agencies",
        "Monthly search counts, and the case number entered for each search, from January 2025 to now",
      ] },

      { h: "Salt Lake County Sheriff's Office" },
      { p: "Here the problem is different. I could not find a public statement about license plate readers or drones from either candidate, Sheriff Rosie Rivera or challenger Shane Manwaring, and I could not find a public source saying what the office uses. Their pages on this site are empty. I asked for:" },
      { list: [
        "Every license plate reader contract, purchase order and invoice since 2023",
        "Every drone purchase and contract since 2023, and the office's drone policy",
        "The license plate reader policy and any audit of its use since 2025",
        "Its data-sharing agreements with other agencies",
        "Monthly counts of license plate searches and drone flights from January 2025 to now",
      ] },

      { p: "Salt Lake County takes requests through an online portal and assigned this one request number 26-3072. The Grand County request went by email to the County Clerk, with a note asking that it be routed to the Sheriff's Office. The Clerk's office replied within minutes that the request was received and forwarded." },

      { h: "The clock" },
      { p: "Utah law gives an agency 10 business days to respond, which lands around October 20. Salt Lake County's portal quotes 14 calendar days and lists a fee of $25 an hour after the first half hour of staff time. I have not agreed to any fee. I asked both offices to answer in 5 business days instead, because both sheriffs are on the November 3 ballot and voters should see this before they vote. I also asked them to waive any fees, since the records are for the public and will be posted here free." },

      { h: "What happens next" },
      { p: "Whatever comes back goes on this site, in full, next to each candidate's name. That includes records that make a candidate look good, records that don't, and a refusal if that is the answer. If an office says no, I will post the refusal and the reason it gives, and appeal." },
      { p: "I am not accusing anyone of anything. Using license plate readers and drones is legal in Utah, and plenty of people support them. The point is that voters should be able to read the record for themselves." },

      { h: "You can do this too" },
      { p: "A GRAMA request needs your name, a mailing address, a phone number if you have one, and a specific description of the records you want. It is free to file. An office can charge for copying and for staff time, and it has to tell you the cost first. The state's records portal takes requests for many agencies in one place." },
      { links: [
        { label: "Utah State Archives: GRAMA questions and answers", url: "https://archives.utah.gov/transparency-services/government-records-access/faq/" },
        { label: "Utah Open Records Portal", url: "https://openrecords.utah.gov/" },
      ] },

      { h: "Read the requests" },
      { p: "These are the letters as sent. My name and contact details are removed." },
      { letter: "grand", label: "Request to the Grand County Sheriff's Office" },
      { letter: "slco", label: "Request to the Salt Lake County Sheriff's Office" },
      { h: "Update, October 7: Grand County answered" },
      { p: "Grand County replied the morning after the request went out, with three records. They are posted here in full, as the county released them." },
      { links: [
        { label: "License plate reader policy 465, the current version", url: "/records/grand-county/2026-10-07_alpr-policy-465-current.pdf" },
        { label: "License plate reader policy 466, the previous version", url: "/records/grand-county/2026-10-07_alpr-policy-466-previous.pdf" },
        { label: "Data sharing report, 69 pages, created June 10, 2026", url: "/records/grand-county/2026-10-07_alpr-data-sharing-report.pdf" },
      ] },
      { p: "The previous policy said:" },
      { quote: "Reasonable suspicion or probable cause is not required before using an ALPR.", who: "Grand County Sheriff's Office Policy 466 (marked Lexipol 2021/05/10)", url: "/records/grand-county/2026-10-07_alpr-policy-466-previous.pdf" },
      { p: "The current policy says:" },
      { quote: "Any time ALPR data is used, written documentation and a case number must be completed.", who: "Grand County Sheriff's Office Policy 465 (marked Lexipol 2026/02/12)", url: "/records/grand-county/2026-10-07_alpr-policy-465-current.pdf" },
      { p: "The sharing report lists more than 1,800 agency entries across the country that the office shares license plate detections with, including federal agencies such as CBP, San Diego Sector Border Patrol, DEA, ATF, IRS Criminal Investigations and the U.S. Marshals Service. It lists about 1,100 agencies the office receives detections from, including one listed as ICE ERO. The report shows who the system is set up to share with. It does not show whether anyone searched Grand County's data." },
      { p: "The release did not include the contracts, any audit, or the monthly search counts and case numbers I asked for. The audit question from the forum is still open." },
      { h: "Update, October 16: Salt Lake County answered" },
      { p: "The Salt Lake County Sheriff's Office sent three records in answer to request 26-3072. They are posted here in full, as the county released them." },
      { links: [
        { label: "License plate reader policy 703", url: "/records/salt-lake-county/2026-10-16_alpr-policy-703.pdf" },
        { label: "Search and seizure policy 306", url: "/records/salt-lake-county/2026-10-16_search-seizure-policy-306.pdf" },
        { label: "Blank Vigilant Solutions data-sharing agreement template", url: "/records/salt-lake-county/2026-10-16_lpr-data-sharing-mou-template.pdf" },
      ] },
      { p: "The license plate reader policy says:" },
      { quote: "Reasonable suspicion or probable cause is not required before using an ALPR.", who: "Salt Lake County Sheriff's Office Policy 703", url: "/records/salt-lake-county/2026-10-16_alpr-policy-703.pdf" },
      { quote: "Such ALPR data may be released to other authorized and verified law enforcement officials and agencies at any time for legitimate law enforcement purposes.", who: "Salt Lake County Sheriff's Office Policy 703", url: "/records/salt-lake-county/2026-10-16_alpr-policy-703.pdf" },
      { p: "It says audits \"should be conducted on a regular basis\" and sets no time limit for keeping the data. The data-sharing record is the vendor's blank form, with the agency names left as placeholders, so it does not show who the office shares with. The search and seizure policy does not mention drones." },
      { p: "The release did not include contracts, an audit, signed sharing agreements, a drone policy, or the monthly search and drone flight counts I asked for." },
      { p: "With the release, the county's records office said the Sheriff's Office formed its Law Enforcement Division on July 1, 2024, and that older records are held by the Unified Police Department. It offered either a list of the agencies that signed the data-sharing agreement or copies of the signed agreements." },
    ],
  },
];
