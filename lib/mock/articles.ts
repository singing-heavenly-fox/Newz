import type { Article } from "@/lib/types";

// TODO: replace with Supabase query (articles + article_analyses + sources).
// Mock data matches AGENTS.md §7 / §19 shapes exactly so the swap is trivial.

const DISCLAIMER =
  "AI-estimated sentiment and political framing — not objective truth. Based on article text evidence only, not the source name.";

function fakeEmbedding(seed: number): number[] {
  // Deterministic 24-dim placeholder (real pgvector is 1536). Null hides Related.
  const v: number[] = [];
  let x = seed;
  for (let i = 0; i < 24; i++) {
    x = (x * 1103515245 + 12345) % 2147483648;
    v.push((x % 2000) / 1000 - 1);
  }
  return v;
}

export const mockArticles: Article[] = [
  {
    id: "city-council-approves-green-transit-plan",
    source: { id: "src-reuters", name: "Reuters", listing_url: "https://www.reuters.com" },
    original_url: "https://www.reuters.com/world/us/city-council-approves-green-transit-plan-2026-09-01/",
    canonical_url: "https://www.reuters.com/world/us/city-council-approves-green-transit-plan-2026-09-01/",
    title: "City council approves $2.1B green transit plan after marathon vote",
    excerpt:
      "The 7–2 vote funds 40 miles of bus rapid transit, 12,000 EV chargers, and a fare-cap pilot for low-income riders starting next spring.",
    image_url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-28T14:30:00Z",
    raw_text:
      "The city council has approved a historic $2.1 billion green transit initiative following a marathon 14-hour session. The 7–2 vote secures funding for 40 miles of bus rapid transit (BRT), 12,000 new electric vehicle (EV) chargers, and a groundbreaking fare-cap pilot program aimed at low-income residents, making it the city's largest-ever climate transit initiative.\n\n> This is a generation-defining investment in our city's sustainable future. It's about equity as much as it is about environment.\n— Mayor's Office\n\n## Funding Breakdown and Timeline\n\nFunding will be rolled out in phases over the next eight years, backed by a mix of federal climate grants and local bonds. Critics raised concerns about the long-term tax implications and construction disruptions, but council members assured that an oversight committee will monitor the project to ensure transparency and prevent budget overruns.\n\n- $2.1B total budget, with 60% funded through federal grants.\n- 40 miles of dedicated bus rapid transit (BRT) lanes.\n- 12,000 EV charging stations installed across the metro area.\n- Transitioning 100% of the city's bus fleet to zero-emissions by 2035.\n\n## Public Response and Next Steps\n\nOpposition from conservative council members focused on the scale of the debt, arguing that the city should prioritize road repairs before committing to vast transit expansions. “We are committing to a generational debt without fixing our current crumbling infrastructure,” argued Councilman James Vance during the debate. Despite these objections, the overwhelming majority voted in favor.\n\n[figure:https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80&auto=format&fit=crop|Residents and activists gathering outside City Hall during the debate.]\n\nImplementation is slated to begin early next year, starting with the design of the bus rapid transit corridors. Citizens can expect the first phase of the EV charger rollout to go live by late 2027.\n\n## Addressing Historically Underserved Communities\n\nSupporters emphasize that this package will drastically reduce emissions, connect underserved neighborhoods, and modernize the region's aging rail network over the next decade. Specifically, over $350 million is earmarked directly for communities that have historically lacked reliable public transit access, with route expansions planned for the outer boroughs.",
    read_minutes: 6,
    analysis: {
      article_id: "city-council-approves-green-transit-plan",
      summary:
        "The council passed a $2.1B transit and charging package aimed at cutting commute emissions 18% by 2030. Supporters cite jobs and cleaner air; critics warn about cost overruns and construction disruption.",
      sentiment_score: 0.45,
      sentiment_label: "positive",
      bias_label: "center",
      left_percentage: 25,
      center_percentage: 55,
      right_percentage: 20,
      bias_score: -0.05,
      confidence: 0.82,
      framing_notes: [
        "Centers on policy mechanics: funding split, timelines, oversight board.",
        "Quotes two supporters and two critics with specific figures.",
        "No speculative claims about national politics.",
      ],
      loaded_terms: ["marathon vote", "landmark package"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(11),
    },
  },
  {
    id: "central-bank-holds-rates-inflation-cools",
    source: { id: "src-bbc", name: "BBC", listing_url: "https://www.bbc.com/news" },
    original_url: "https://www.bbc.com/news/business-2026-09-20-rates-hold",
    canonical_url: "https://www.bbc.com/news/business-2026-09-20-rates-hold",
    title: "Central bank holds rates as inflation cools to 2.4%",
    excerpt:
      "Policymakers kept borrowing costs steady, pointing to easing grocery and energy prices while flagging housing as the remaining pressure point.",
    image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-27T09:00:00Z",
    raw_text:
      "The central bank kept its benchmark rate steady on Tuesday as annual inflation cooled to 2.4%, down from 3.1% in spring, citing easing grocery and energy prices.\n\nThe decision was widely expected: futures markets had priced a hold at 94% odds, and the bank's statement changed only modestly from July — swapping “elevated uncertainty” for “gradual progress” on prices.\n\nGrocery inflation slowed to 1.1% as harvest supply recovered, while energy prices fell 2.3% on softer crude. Shelter, running near 4%, remains the stubborn outlier, and services inflation has barely budged for three straight quarters.\n\nMinutes from the meeting show policymakers want two straight quarters of slowing housing costs before cutting. “The bank is buying time, and it can afford to,” said Dana Whitfield, chief economist at Meridian Trust. “Growth is steady, hiring is intact — there is no reason to rush.”\n\nNot everyone agrees patience is free. Labor economists warn that holding too long risks a hiring freeze by spring, while business groups argue borrowing costs are already squeezing warehouse and equipment loans.\n\nMarkets took the statement as patient rather than hawkish: bond yields slipped, and traders now split the first cut between December and early next year. The bank meets again in seven weeks, with two inflation prints due before then.",
    read_minutes: 4,
    analysis: {
      article_id: "central-bank-holds-rates-inflation-cools",
      summary:
        "Rates stay flat as annual inflation falls to 2.4%. The bank signals patience on cuts until housing costs slow for two consecutive quarters.",
      sentiment_score: 0.1,
      sentiment_label: "neutral",
      bias_label: "center",
      left_percentage: 15,
      center_percentage: 70,
      right_percentage: 15,
      bias_score: 0,
      confidence: 0.9,
      framing_notes: [
        "Data-driven: cites CPI components and bank statement verbatim.",
        "Balanced analyst quotes from labor and business economists.",
      ],
      loaded_terms: [],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(22),
    },
  },
  {
    id: "coastal-town-rebuilds-after-hurricane",
    source: { id: "src-npr", name: "NPR", listing_url: "https://www.npr.org" },
    original_url: "https://www.npr.org/2026/09/25/coastal-town-rebuilds-after-hurricane",
    canonical_url: "https://www.npr.org/2026/09/25/coastal-town-rebuilds-after-hurricane",
    title: "A coastal town rebuilds — neighbors first, paperwork second",
    excerpt:
      "After the hurricane tore through Port Alina, residents turned a school gym into a supply hub and rebuilt six homes before federal crews arrived.",
    image_url: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-25T18:15:00Z",
    raw_text:
      "When the hurricane tore through Port Alina, residents turned the school gym into a supply hub within hours — logging 9,000 volunteer hours in the first two weeks and rebuilding six homes before federal crews arrived.\n\nNurses ran a pop-up clinic from the library annex while fishing crews ferried ice, fuel, and medicine down streets that were still waist-deep. “Nobody waited to be told,” organizer Priya Raman said. “You just picked up a shovel.”\n\nThe mutual-aid network ran on group chats and a whiteboard: 400 cots placed, 11,000 hot meals served, and a tool library that lent out 600 chainsaws, pumps, and generators with nothing but a signature.\n\nOfficials say power is now back for 90% of households and aid claims are being processed in about three weeks. County emergency chief Rob Calloway credits the volunteers with buying the county “the two most important weeks,” adding that “the gym operation outperformed our own staging area.”\n\nRecovery is uneven. Renters on the east side say paperwork is still the hardest part — many lack the leases and photos adjusters demand — and two apartment blocks remain condemned awaiting inspection.\n\nStill, the town council voted unanimously to keep the volunteer network as a permanent reserve corps with a radio cache and a standing supply depot. “Next time, and there will be a next time, we start on day zero,” Raman said.",
    read_minutes: 8,
    analysis: {
      article_id: "coastal-town-rebuilds-after-hurricane",
      summary:
        "A community-led recovery story: mutual-aid networks filled gaps in the first weeks while officials raced to restore power and process aid claims.",
      sentiment_score: 0.62,
      sentiment_label: "positive",
      bias_label: "left",
      left_percentage: 55,
      center_percentage: 35,
      right_percentage: 10,
      bias_score: -0.45,
      confidence: 0.68,
      framing_notes: [
        "Human-interest framing with emphasis on collective action.",
        "Light on criticism of agencies; focuses on resilience.",
      ],
      loaded_terms: ["neighbors first", "forgotten town"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(33),
    },
  },
  {
    id: "chip-factory-breaks-ground-jobs-debate",
    source: { id: "src-fox", name: "Fox Business", listing_url: "https://www.foxbusiness.com" },
    original_url: "https://www.foxbusiness.com/economy/chip-factory-breaks-ground-jobs-debate-2026-09-24",
    canonical_url: "https://www.foxbusiness.com/economy/chip-factory-breaks-ground-jobs-debate-2026-09-24",
    title: "Chip factory breaks ground, igniting debate over subsidies and jobs",
    excerpt:
      "The $8B plant promises 3,000 jobs, but watchdogs question the $1.2B incentive package and whether wage pledges will hold.",
    image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-24T12:00:00Z",
    raw_text:
      "Executives and union leaders shared a stage at the groundbreaking for the $8B chip plant, which promises 3,000 permanent jobs and a supplier park employing 1,500 more.\n\nThe $1.2B incentive package — land, tax abatements, and training grants — drew fire from watchdogs who note the wage pledge is nonbinding after year five and clawbacks only trigger if headcount falls below 60%.\n\n“This is a taxpayer gamble dressed up as a jobs guarantee,” said Mara Ellison of the Fiscal Watch Institute. “If the wages drift down after year five, the county has paid top dollar for average jobs.”\n\nThe company counters that the math works: first wafers ship in 2028, suppliers have already signed letters of intent, and 400 apprenticeship seats are reserved for local community-college graduates. “We are putting steel in the ground and paychecks in this county,” plant director Tom Okafor said.\n\nLabor economists split the difference. The 3,000 direct jobs are real, they say, but regions routinely overestimate the supplier multiplier — and abatements shift school and road costs onto existing homeowners for a decade.\n\nThe county board approved the package 4–1 after a five-hour hearing. Construction hiring starts next month, with the first production hall due to top out by late 2027.",
    read_minutes: 5,
    analysis: {
      article_id: "chip-factory-breaks-ground-jobs-debate",
      summary:
        "A major semiconductor plant starts construction with big job claims and bigger subsidy questions. Both the economic upside and fiscal risk are documented.",
      sentiment_score: -0.05,
      sentiment_label: "neutral",
      bias_label: "right",
      left_percentage: 15,
      center_percentage: 30,
      right_percentage: 55,
      bias_score: 0.4,
      confidence: 0.74,
      framing_notes: [
        "Emphasizes market growth, deregulation benefits, and taxpayer cost.",
        "Skeptical of government incentive structures.",
      ],
      loaded_terms: ["taxpayer gamble", "job bonanza"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(44),
    },
  },
  {
    id: "hospital-ai-triage-cuts-wait-times",
    source: { id: "src-guardian", name: "The Guardian", listing_url: "https://www.theguardian.com" },
    original_url: "https://www.theguardian.com/society/2026/sep/22/hospital-ai-triage-wait-times",
    canonical_url: "https://www.theguardian.com/society/2026/sep/22/hospital-ai-triage-wait-times",
    title: "Hospital AI triage cuts ER waits 31% — doctors urge caution",
    excerpt:
      "A year-long trial sorted 40,000 ER cases with nurse oversight. Missed-urgency rates held flat, but ethicists want stronger audits.",
    image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-22T08:45:00Z",
    raw_text:
      "In a year-long trial across 40,000 ER visits, an AI triage assistant working under nurse oversight flagged likely strokes and sepsis within 90 seconds and cut average waits 31%.\n\nThe system reads vitals, complaint text, and history, then proposes an urgency rank that a nurse must confirm or override. Every override is logged, building the audit trail the authors call the trial's most important product.\n\nMissed-urgency rates held flat versus the control period — the result the skeptics demanded. But the study ran at a single well-staffed hospital, and the authors caution that rural and safety-net sites with thinner staffing may see different results.\n\n“The headline is not that the machine is smart. It is that the nurses stayed in charge,” said Dr. Amara Osei, the trial's lead researcher. “Every decision the system touched was signed off by a human who could see its reasoning.”\n\nEthicists praised the audit trail while urging independent review of error rates by age, language, and insurance status before wider rollout. “Averages can hide exactly the disparities we fear most,” said bioethicist Dr. Lena Marsh. “Publish the error rates by subgroup, then talk about rollout.”\n\nHospital leadership says a second trial at three regional sites begins in January, with regulators observing. Full deployment, they stress, depends on the subgroup audits clearing — not on the wait-time headline.",
    read_minutes: 7,
    analysis: {
      article_id: "hospital-ai-triage-cuts-wait-times",
      summary:
        "AI-assisted triage shortened emergency waits without raising miss rates in one hospital trial. Authors stress human oversight and independent audits before wider rollout.",
      sentiment_score: 0.3,
      sentiment_label: "positive",
      bias_label: "mixed",
      left_percentage: 35,
      center_percentage: 35,
      right_percentage: 30,
      bias_score: -0.05,
      confidence: 0.61,
      framing_notes: [
        "Presents both efficiency gains and equity/privacy concerns.",
        "Evidence is single-site; article notes limited generalizability.",
      ],
      loaded_terms: ["robot nurses"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(55),
    },
  },
  {
    id: "drought-cuts-river-levels-farmers-adapt",
    source: { id: "src-reuters", name: "Reuters", listing_url: "https://www.reuters.com" },
    original_url: "https://www.reuters.com/world/drought-river-levels-farmers-adapt-2026-09-18/",
    canonical_url: "https://www.reuters.com/world/drought-river-levels-farmers-adapt-2026-09-18/",
    title: "Drought cuts river levels to 40-year low as farmers adapt",
    excerpt:
      "Irrigation districts face 30% allocations. Growers switch to drip lines and drought-tolerant strains while towns ration water.",
    image_url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-18T16:20:00Z",
    raw_text:
      "Reservoir gauges show the lowest September levels on record as the river runs at 40% of normal, forcing irrigation districts to cut allocations to 30%.\n\nGrowers are switching to drip lines, deficit irrigation, and drought-tolerant strains — moves agronomists say save 20–35% of water but cut yields 10–15% in year one. “Nobody adopts drip because it is fashionable. They adopt it because the canal is empty,” said extension agronomist Bill Hart.\n\nThe tradeoff is brutal for row crops. Cotton and alfalfa acres are being fallowed first, while high-value orchards get every spare drop — a triage that keeps trees alive but idles seasonal crews.\n\nTowns now ration outdoor watering to two days a week, and wells on the valley's east bench are dropping a foot a month. The county has opened two emergency fill stations and extended library hours as cooling centers.\n\nState relief funds are tied to efficiency upgrades rather than acreage, a shift farm groups call painful but overdue. “Paying for pipe instead of acres finally rewards the growers who conserved early,” said Farm Bureau chair Diane Kessler, “but the application window punished anyone without an engineer on retainer.”\n\nForecasters warn of a second dry winter, with snowpack projections at 60% of normal. Officials say a third year would force urban rationing beyond lawns — to commercial use and new connections.",
    read_minutes: 5,
    analysis: {
      article_id: "drought-cuts-river-levels-farmers-adapt",
      summary:
        "Severe drought forces water rationing and rapid on-farm adaptation. Officials warn of a second dry winter; relief funds are tied to efficiency upgrades.",
      sentiment_score: -0.55,
      sentiment_label: "negative",
      bias_label: "center",
      left_percentage: 20,
      center_percentage: 60,
      right_percentage: 20,
      bias_score: 0,
      confidence: 0.86,
      framing_notes: [
        "Sticks to hydrology data and farm-level responses.",
        "Avoids attributing single event to policy decisions.",
      ],
      loaded_terms: ["parched heartland"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(66),
    },
  },
  {
    id: "election-poll-shows-dead-heat",
    source: { id: "src-bbc", name: "BBC", listing_url: "https://www.bbc.com/news" },
    original_url: "https://www.bbc.com/news/election-poll-dead-heat-2026-09-15",
    canonical_url: "https://www.bbc.com/news/election-poll-dead-heat-2026-09-15",
    title: "Poll shows dead heat with six weeks to go — and a volatile middle",
    excerpt:
      "Both camps sit at 44% with 12% undecided. The survey's 3-point margin means the lead has changed hands three times this month.",
    image_url: "https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-15T10:00:00Z",
    raw_text:
      "Both camps sit at 44% with 12% undecided in the new poll of 1,200 likely voters (margin ±3 points), the third lead change this month.\n\nThe topline barely moved — but underneath, the electorate churned. One in five respondents picked a different candidate than last month, the highest switch rate this cycle.\n\nPollsters caution that likely-voter screens vary widely this far out, and the undecided bloc skews young and independent — the hardest group to model. “Six weeks out, the screen is the poll,” said director of polling Sam Oduya. “Change who counts as likely, and watch four points move.”\n\nThe campaigns each claimed momentum within the hour, but the report itself stresses uncertainty: six in ten voters say they could still change their minds, and the ballot test has never separated the camps by more than the margin.\n\nMethodology notes are unusually prominent this round: dual-frame sampling, Spanish-language callbacks, and a published raw file. Outside reviewers called the transparency “the actual story” in a month of noisy numbers.\n\nWhat to watch: two debates, one jobs report, and early-voting data that historically embarrasses September polling. Until then, the only honest call is the one the report makes — too close, too early.",
    read_minutes: 4,
    analysis: {
      article_id: "election-poll-shows-dead-heat",
      summary:
        "A credible poll finds a tied race with a large undecided bloc. Coverage stresses uncertainty and methodology limits rather than momentum narratives.",
      sentiment_score: 0.0,
      sentiment_label: "neutral",
      bias_label: "unclear",
      left_percentage: 33,
      center_percentage: 34,
      right_percentage: 33,
      bias_score: 0,
      confidence: 0.42,
      framing_notes: [
        "Evidence too thin for a framing call; toplines are within margin.",
        "Correctly refuses to infer momentum from a single poll.",
      ],
      loaded_terms: [],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: null, // no embedding → Related hidden (tests §20 rule)
    },
  },
  {
    id: "night-train-revival-sells-out",
    source: { id: "src-npr", name: "NPR", listing_url: "https://www.npr.org" },
    original_url: "https://www.npr.org/2026/09/10/night-train-revival-sells-out",
    canonical_url: "https://www.npr.org/2026/09/10/night-train-revival-sells-out",
    title: "Night-train revival sells out as travelers ditch short flights",
    excerpt:
      "Sleeper routes are full through the holidays. Operators add cars, but track fees and delays remain the make-or-break test.",
    image_url: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&q=80&auto=format&fit=crop",
    published_at: "2026-09-10T07:30:00Z",
    raw_text:
      "Sleeper trains are sold out through the holidays as travelers trade short flights for overnight rails — bookings on the two revived routes are up 70% year over year.\n\nPassengers describe falling asleep in one city and waking in another. “I boarded after dinner, slept eight hours, and walked straight into my meeting,” said frequent rider Jonas Berg. “No airport, no middle seat, no 5 a.m. alarm.”\n\nOperators are quietly adding cars and restoring a third consist mothballed since 2019. The constraint is not demand, they say, but track-access fees — freight railroads charge per mile, and every extra departure pays full freight.\n\nAn airline analyst counters that deluxe sleepers still cost more than budget flights for families, and punctuality — currently 78% on-time — must clear 85% to keep converts. “Novelty fills the first season,” the analyst said. “Reliability fills the fifth.”\n\nClimate policy is the tailwind: two states now rebate rail fares for under-25s, and corporate travel desks count overnight rail as zero-hotel nights, trimming trip budgets.\n\nThe real test comes in February, the emptiest month. If sleepers hold above 60% occupancy through winter, operators promise daily service and refurbished dining cars by spring.",
    read_minutes: 5,
    analysis: {
      article_id: "night-train-revival-sells-out",
      summary:
        "Overnight rail demand surges on two revived routes. The piece balances traveler enthusiasm with operator warnings about capacity and punctuality.",
      sentiment_score: 0.35,
      sentiment_label: "positive",
      bias_label: "left",
      left_percentage: 50,
      center_percentage: 40,
      right_percentage: 10,
      bias_score: -0.4,
      confidence: 0.7,
      framing_notes: [
        "Pro-transit framing: climate benefits lead, costs secondary.",
        "Includes one airline analyst counterpoint.",
      ],
      loaded_terms: ["flight shame", "rail renaissance"],
      disclaimer: DISCLAIMER,
      model: "gpt-4o-mini (mock)",
      embedding: fakeEmbedding(88),
    },
  },
];
