# Changes made during the hackathon window

The submission period opened October 1, 2026, 9:15 AM Pacific. The repository was empty before
this work; everything here was built on or after October 2, 2026.

| Date | Change |
|---|---|
| Oct 2 | First prototype: said-vs-did records for Utah candidates on Flock cameras, the Great Salt Lake and data centers, with sources |
| Oct 5 | Issue image reel, police drones issue, records request tracking, public tallies service (Express + Postgres), Eagle research chat, Salt Lake County candidates, where-do-you-vote finder |
| Oct 5 | Utah Top 20, The Odds (prediction markets), Take action email composer |
| Oct 6 | Blog with first post; two GRAMA requests filed and tracked; code moved into this repository |
| Oct 6 | Heraldic Eagle redraw, founder story, shop (signs, shirts, hats) on PayPal Orders v2 sandbox |
| Oct 6 | Paid evidence file: free teaser, PayPal sandbox unlock, AG Grid Community table. |
| Oct 6 | Six Salt Lake City Council members (camera grant vote) and the Salt Lake County Council District 1 race (data center moratorium vote). House rules, terms of service and privacy moved to their own pages |
| Oct 6 | Home page with a state picker; Utah moved to `/utah`. Local run with an embedded database. First real PayPal sandbox order created |
| Oct 20 | Home hero round 1: "Is your politician legit or full of shit?", one ZIP box (ZIP read in the browser, never sent), no Utah in the hero, title or meta; accessibility bar (larger text, high contrast, reduce motion) at the top |
| Oct 20 | Home round 2: proof card under the hero (one quote next to the same person's official vote on the same bill, generated from the built data); closed-state ZIP opens an email box right there; "Election Day is Nov 3."; live on-file counts; "Don't know your zip?" quiz link; state buttons, tile map and donate pill turned into text links; ZIP box repeated after the state cards; "Share your call" |
| Oct 20 | Michigan opened: 460 candidates from the Department of State's official list; 509 official roll-call votes on roads, wages and proof of citizenship to vote; 13 checked quotes; 3 "Who votes like you" questions |
| Oct 23 | Georgia opened: 442 candidates from the Secretary of State's official file; 1,344 official roll-call votes on taxes, injury lawsuits, voting machines and recounts, and data centers; 26 checked quotes; 5 "Who votes like you" questions. Analytics: team devices opt out with ?team=1 |
| Oct 23 | Florida opened: 355 candidates from the Division of Elections list (31 unopposed, labeled as elected without appearing on the ballot); 521 official roll-call votes on Amendment 3, property insurance, the congressional map, the petition law and immigration; 20 checked quotes; 4 "Who votes like you" questions |
| Oct 24 | Pennsylvania opened: 436 candidates from the Department of State Candidate Database; 1,182 official roll-call votes on the budget, data centers, the minimum wage and marijuana; 38 checked quotes; 5 "Who votes like you" questions |
| Oct 24 | Nevada opened: 128 candidates from the Secretary of State's certified list; 372 official roll-call votes on housing, prices and voting rules (NELIS); 9 checked quotes, 3 from the governor's veto messages; 5 "Who votes like you" questions |
| Oct 24 | Minnesota opened: 422 candidates from the Secretary of State's general-election file (public fields only); 813 official roll-call votes on fraud, MinnesotaCare and taxes from the House and Senate Journals; 15 checked quotes; 4 "Who votes like you" questions |
| Oct 25 | Ohio opened: 294 candidates (statewide from the Secretary of State's sample ballot; each district from its certifying county board); 768 official roll-call votes including SJR 10 (Issue 3, photo ID); 13 checked quotes; 5 questions. Ohio House District 88 is marked on the page as not yet on file and left out of comparisons. Minnesota House districts now keep their A/B letter in the finder and the address lookup |
| Oct 25 | Maine opened (House votes only): 352 candidates from the Secretary of State's general-election list and withdrawals file; 632 official House roll-call votes on the budget, firearms, data centers and ranked-choice voting; 16 checked quotes; 3 questions. Senate roll calls to follow |
| Oct 20 | PostHog events carry page_variant, source, state and state_open: hero_viewed, zip_started, zip_submitted, result_viewed, vote_source_clicked, quiz_started, quiz_question_answered, quiz_completed, share_clicked, a11y_toggle_used, closed_state_email_submitted. No names, emails or ZIPs |
| Oct 27 | Home: "5,400+ officials and candidates on file" line; quiz link reads "Don't know who to vote for? Ask the Eagle" |
| Nov 5 | ZIP first: the home box takes a ZIP and opens the state; the street address is asked on the state page to narrow to your own races. Agree to Disagree board tagline |
| Nov 9 | SEO: person pages with no quote are kept out of search results; honest sitemap; post-election page titles. Board: networks caught spamming are blocked quietly |
| Nov 9 | README: section for judges at the top (what it does, live demo, sandbox buyer steps, architecture, sponsor tools) |
| Nov 9 | Donkey Tracker (demo only, off by default): $5 per-candidate email alerts through PayPal Orders v2 sandbox. Activates only after a server-verified capture; consent box, confirmed email, signed unsubscribe that deletes the address, one alert per change, admin-only demo trigger |

Still to confirm on the live site: a buyer-approved PayPal sandbox purchase of the evidence file, and a live
Eagle web search (needs the API key set on the server). The Eagle verdict in the original spec was dropped on purpose: visitors decide.
