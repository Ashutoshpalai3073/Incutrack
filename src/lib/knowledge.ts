export interface ChatContext {
  pathname?: string;
  tab?: string;
  section?: string;
}

export const WEBSITE_KNOWLEDGE = `
PLATFORM: Incutrack
WHAT IT IS: Incutrack is a two-sided MARKETPLACE that connects startup founders
with investors — venture capital firms (VCs) and angel investors. Founders get
discovered and raise capital; investors source, evaluate, and back deals. It is
NOT a chatbot product, NOT a back-office VC fund/portfolio-management tool, and NOT
a founder-only tracker. Every feature and metric is framed around activity
happening ON the platform between the two sides.

TAGLINE / POSITIONING: The marketplace where startups and capital meet — founders
build and get discovered; investors scout, evaluate, and deploy with conviction.

WHO IT IS FOR (and how it benefits them):
- FOUNDERS / STARTUPS: Register a startup, earn an AI-generated IncuScore™, build a
  Brand Vault of pitch materials, get discovered by verified investors, share
  confidential decks only with investors they approve, raise capital, and tap
  mentors and events. Benefit: real visibility to capital + a structured path to
  becoming investor-ready.
- INVESTORS (VCs & ANGELS): Register a fund/mandate (admin-verified), scout a live,
  pre-scored pipeline of startups, shortlist, run secure diligence, message
  founders, and track capital deployed through Incutrack matches. Benefit:
  higher-quality deal flow with far less manual effort.
- ADMIN / PLATFORM TEAM: Curate quality and trust — approve startup registrations,
  verify investor funds, and moderate events.
- VISITORS: Browse public directories (verified funds, public startup brand decks)
  before signing up.

TWO PORTALS:
1. EXPLORE HUB (founder side, route /hub): the founder's workspace — Command
   Center, Pipeline, Brand Vault, Mentor Network, Event Arena, Analytics, National
   Capital Matrix, and (admins only) the Admin Panel.
2. SCOUT HUB (investor side, route /scout, "VC Portal"): the investor's command
   center — Investment Cockpit, Deal Flow, Diligence Room, Startup Network, Investor
   Network, Demo Days, Market Insights, Deployment Tracker.

ACCOUNTS & ROLES: Roles are founder, vc, admin, and visitor. Users sign up / log in
(email-based auth). All changes are ownership-checked on the server — a founder can
only manage their own startup; an investor only their own mandate.

CORE CONCEPTS:
- IncuScore™: an AI-generated quality/readiness score (0–100) for a startup and its
  pitch materials, used to rank and surface promising companies to investors.
- Brand Vault: a founder's document vault. A PUBLIC ("brand") deck is visible to all
  and feeds the IncuScore and investor interest; a PRIVATE ("investor"/corporate)
  deck is confidential and only reaches investors the founder approves.
- Startup approval gate: a newly registered startup is 'pending' and visible only to
  its owner and admins until an admin approves it. Uploading to the Brand Vault is
  also locked until the startup is approved — before then the app shows a polite
  "approval pending" message.
- Verified funds: investor mandates are admin-verified before appearing in the
  public Investor Network.

KEY MARKETPLACE INTERACTIONS (the two sides in motion):
- Investors browse and shortlist startups; shortlisting or revoking (revoke needs a
  reason) notifies the admin.
- Investors request access to a startup's confidential deck; the founder approves or
  denies — denied investors never even see the deck exists.
- Approved corporate decks surface to verified investors in the Scout Hub Diligence
  Room, with view tracking and an audit log.
- Investors can "Message" a founder from the Scout Hub; this emails the founder's
  registered email with the investor as reply-to.
- Founders raise, investors deploy — capital moved through platform matches is
  tracked as marketplace-sourced activity.

GETTING STARTED:
- Founders: sign up → open the Explore Hub → register your startup in the Pipeline →
  get your IncuScore → once approved, upload decks to your Brand Vault → get
  discovered by investors.
- Investors: sign up → open the Scout Hub → register your fund/mandate (Add Mandate /
  Register Your Fund) → once verified, scout the pipeline, shortlist, and request
  diligence.

FAQ:
Q: What is Incutrack?
A: A two-sided marketplace connecting startup founders with VCs and angel investors —
   founders get discovered and raise; investors source, evaluate, and deploy capital.
Q: Is it a portfolio-management tool for VCs?
A: No. It's a marketplace. Investor dashboards focus on deals sourced and capital
   deployed THROUGH Incutrack, not back-office fund accounting.
Q: How do founders get discovered?
A: Register your startup, earn an IncuScore, and publish a public brand deck. Verified
   investors browse and shortlist you from the Scout Hub.
Q: Why can't I upload to my Brand Vault yet?
A: Uploads unlock only after an admin approves your startup registration. Until then
   your startup is visible only to you, and the app asks for a little patience.
Q: How do investors join?
A: Sign up, open the Scout Hub, and register your fund/mandate. An admin verifies it
   before it appears in the public Investor Network.
Q: Are my confidential documents safe?
A: Yes. Private/corporate decks are shared only with investors you explicitly approve,
   with view tracking and an audit trail. Denied investors can't see them.
Q: Is it free?
A: Please check the pricing section or contact the Incutrack team for details.
`;

// Per-tab guides, scoped by portal ("hub" = founder Explore Hub, "scout" = investor
// Scout Hub) so shared tab ids (e.g. "network") resolve to the right section.
const TAB_GUIDE: Record<string, { label: string; summary: string; whatItIs: string; whenToUse: string }> = {
  // ── EXPLORE HUB (founders) ──────────────────────────────────────────────
  'hub:overview': {
    label: 'Command Center',
    summary: "The founder's home dashboard in the Explore Hub.",
    whatItIs: 'Command Center gives founders an at-a-glance view of their marketplace presence — headline stats like companies, capital raised, funded/exited, and average IncuScore™ — plus quick jumps into the Pipeline, Brand Vault, and other sections.',
    whenToUse: 'Use it as your daily starting point to see where your startup stands and jump into the right workspace.'
  },
  'hub:pipeline': {
    label: 'Pipeline',
    summary: 'A kanban of startups across their journey stages.',
    whatItIs: 'Pipeline is a board of startups across stages (Ideation, MVP Built, Validation, Growth, Funding Secured). Founders register a startup here; a new startup is "pending" and visible only to its owner until an admin approves it, after which it appears across the marketplace. Cards show IncuScore, sector, and traction.',
    whenToUse: 'Use it to register your startup, move it through stages, and track where every company sits.'
  },
  'hub:vault': {
    label: 'Brand Vault',
    summary: "The founder's pitch-document vault.",
    whatItIs: 'Brand Vault holds a founder\'s pitch materials. A PUBLIC brand deck is visible to everyone and feeds the IncuScore and investor interest; a PRIVATE investor/corporate deck is confidential and shared only with investors the founder approves. Documents fall into five categories (Deck, Doc, Sheet, Video, Bundle) and filenames follow the _public_vault / _private_vault pattern. Uploading is locked until an admin approves the startup — before then a polite "approval pending" message appears.',
    whenToUse: 'Use it to publish your public deck for discovery and to store confidential decks you selectively share with investors.'
  },
  'hub:network': {
    label: 'Mentor Network',
    summary: 'A directory of mentors founders can connect with.',
    whatItIs: 'Mentor Network is where founders find and connect with mentors for guidance, filtered by focus area — the founder-support layer of the marketplace.',
    whenToUse: 'Use it when you want expert guidance or introductions to mentors relevant to your stage and sector.'
  },
  'hub:events': {
    label: 'Event Arena',
    summary: 'Startup ecosystem events and RSVPs.',
    whatItIs: 'Event Arena surfaces demo days, workshops, hackathons, and office hours. Founders can RSVP and submit their own events, which go to the Incutrack admin team for approval before appearing publicly.',
    whenToUse: 'Use it to find events to attend or to submit an event for the community.'
  },
  'hub:analytics': {
    label: 'Analytics',
    summary: 'Data-driven insights on presence and the ecosystem.',
    whatItIs: 'Analytics shows sector breakdowns, score trends, and traction/funding metrics so founders understand how they are tracking and where they stand in the marketplace.',
    whenToUse: 'Use it to measure progress and spot what needs attention before your next raise.'
  },
  'hub:funding': {
    label: 'National Capital Matrix',
    summary: 'Live cross-border matchmaking and capital activity.',
    whatItIs: 'National Capital Matrix surfaces investors and their status (Committed, In Diligence, In Discussion) and capital flowing toward startups — framed as live marketplace matchmaking between founders and funds.',
    whenToUse: 'Use it to see which investors are active and how capital is moving across the ecosystem.'
  },
  'hub:admin': {
    label: 'Admin Panel',
    summary: 'The quality-control cockpit (admins only).',
    whatItIs: 'Admin Panel is where admins keep the marketplace trustworthy: approve or reject startup registrations (which unlocks their visibility and Brand Vault uploads), verify investor funds/mandates, and moderate submitted events, stage-advance requests, deal-interest and diligence requests, and contact messages.',
    whenToUse: 'Use it (as an admin) to review and approve everything entering the marketplace.'
  },

  // ── SCOUT HUB (investors) ───────────────────────────────────────────────
  'scout:cockpit': {
    label: 'Investment Cockpit',
    summary: "The investor's command center.",
    whatItIs: 'Investment Cockpit surfaces the fund\'s Capital Mandate (capital deployable on Incutrack), Dry Powder, capital Deployed via the platform, shortlisted deals, and Target MOIC, alongside a Deal Radar, shortlisted deals, "Sourced Deal Yield" (performance of deals sourced through Incutrack), a live Marketplace Activity feed, and Pipeline Health. It is framed around marketplace-sourced dealmaking, not back-office fund accounting.',
    whenToUse: 'Use it for a strategic, at-a-glance overview of your deal activity and deployable capital.'
  },
  'scout:dealflow': {
    label: 'Deal Flow',
    summary: 'A kanban pipeline of live deals from the marketplace.',
    whatItIs: 'Deal Flow tracks each marketplace-sourced opportunity across stages from first look through diligence, with sector filtering and scoring.',
    whenToUse: 'Use it to browse, screen, and move promising startups through your evaluation pipeline.'
  },
  'scout:diligence': {
    label: 'Diligence Room',
    summary: 'A secure space to review confidential founder decks.',
    whatItIs: 'Diligence Room is an access-controlled space where verified investors review confidential corporate/investor decks founders have shared, with view tracking and an audit log. Investors can request access to a private deck; the founder approves or denies, and denied investors never see the deck exists.',
    whenToUse: 'Use it to run due diligence on shared materials before making a decision.'
  },
  'scout:network': {
    label: 'Startup Network',
    summary: 'A directory of founders and startups on the marketplace.',
    whatItIs: 'Startup Network lets investors discover founders and their companies and reach out to those that fit their thesis.',
    whenToUse: 'Use it to find and connect with startups matching your sector, stage, and check size.'
  },
  'scout:vcnetwork': {
    label: 'Investor Network',
    summary: 'The public directory of every verified fund.',
    whatItIs: 'Investor Network is the public directory of verified funds on Incutrack, visible to founders, investors, and visitors. Investors register their own fund here ("Register Your Fund"); an admin verifies it before it appears.',
    whenToUse: 'Use it to list your fund publicly or to see the other investors active on the platform.'
  },
  'scout:demodays': {
    label: 'Demo Days',
    summary: 'Curated events where investors meet pitching startups.',
    whatItIs: 'Demo Days surfaces curated events where investors meet startups pitching live — a direct founder-investor interaction channel in the marketplace.',
    whenToUse: 'Use it to find live pitch events and showcases to attend.'
  },
  'scout:insights': {
    label: 'Market Insights',
    summary: 'Ecosystem-level market intelligence for investors.',
    whatItIs: 'Market Insights shows Sector Momentum (how verticals are performing), Sourced Deal Yield, a Deal Pipeline trend, Score Distribution of startups, and Thesis Match (how well marketplace startups align to the investor\'s thesis on sector fit, stage, check size, and geography). It is about spotting macro marketplace trends, not internal fund metrics.',
    whenToUse: 'Use it to read the market, compare sectors, and see which startups fit your thesis.'
  },
  'scout:deployment': {
    label: 'Deployment Tracker',
    summary: 'A log of capital deployed through Incutrack matches.',
    whatItIs: 'Deployment Tracker shows Sourced Allocations (each marketplace-driven position with ROI), the Marketplace Allocation mix, Mandate Utilisation (deployed vs. ready), a Deployment Capacity simulator (how many more marketplace startups the remaining dry powder can back), and Return Targets. It reframes deployment as marketplace-driven investment wins.',
    whenToUse: 'Use it to track what you have deployed through the platform and how much capacity remains.'
  }
};

// Landing-page section guides (route "/").
const LANDING_SECTIONS: Record<string, { label: string; summary: string; details: string }> = {
  home: {
    label: 'Home',
    summary: 'Hero and marketplace positioning for both sides.',
    details: 'The Home hero introduces Incutrack as the marketplace where startups and capital meet, with a "For Founders" path (build, track, get discovered) and a "For Investors" path ("Scout smarter. Deploy with conviction.").'
  },
  features: {
    label: 'Features',
    summary: 'High-level list of platform capabilities.',
    details: 'Features covers Pipeline, Brand Vault, Mentor Network, Investor Matching, Diligence, Market Insights, and the Event Arena — how each helps founders get discovered and investors source deals.'
  },
  founders: {
    label: 'Founders',
    summary: 'Founder-facing workflow and benefits.',
    details: 'The Founders view describes the Explore Hub: register a startup, earn an IncuScore™, build a Brand Vault, get discovered by verified investors, and share confidential decks only with approved investors.'
  },
  investors: {
    label: 'Investors',
    summary: 'Investor-facing Scout Hub features.',
    details: 'The Investors view describes the Scout Hub: scout a pre-scored pipeline, shortlist, run diligence, message founders, and track capital deployed through Incutrack matches.'
  },
  testimonials: {
    label: 'Testimonials',
    summary: 'Social proof from founders and investors.',
    details: 'Testimonials presents short stories from founders and investors on how Incutrack improved discovery, diligence, and fundraising.'
  },
  about: {
    label: 'About',
    summary: 'Team, mission and positioning.',
    details: 'About explains the mission and vision for building the marketplace connecting startups and capital.'
  },
  contact: {
    label: 'Contact',
    summary: 'Ways to reach the team.',
    details: 'Contact contains the contact form and pointers to reach the Incutrack team for sales, partnerships, or support.'
  }
};

function normalizeTab(tab?: string) {
  return (tab || '').trim().toLowerCase();
}

// Which portal is the user in, based on the route.
function hubKeyFor(pathname: string): 'scout' | 'hub' | null {
  if (pathname.includes('/scout')) return 'scout';
  if (pathname.includes('/hub')) return 'hub';
  return null;
}

// Resolve the tab guide, preferring the portal-scoped key ("hub:pipeline") and
// falling back to a bare tab id for safety.
function resolveTabGuide(hub: 'scout' | 'hub' | null, tab: string) {
  if (!tab) return undefined;
  if (hub && TAB_GUIDE[`${hub}:${tab}`]) return TAB_GUIDE[`${hub}:${tab}`];
  return TAB_GUIDE[tab] ?? TAB_GUIDE[`scout:${tab}`] ?? TAB_GUIDE[`hub:${tab}`];
}

export function getContextualKnowledge(context: ChatContext = {}) {
  const pathname = context.pathname || '';
  const tab = normalizeTab(context.tab);
  const section = context.section?.trim();
  const hub = hubKeyFor(pathname);

  const routeLabel = hub === 'scout'
    ? 'Scout Hub (investor / VC portal)'
    : hub === 'hub'
      ? 'Explore Hub (founder workspace)'
      : 'Landing page / general marketplace experience';

  const guide = resolveTabGuide(hub, tab);

  const contextLines = [
    `CURRENT VIEW: ${routeLabel}`,
    guide
      ? `ACTIVE TAB: ${guide.label} — ${guide.summary}`
      : 'ACTIVE TAB: None or unknown',
    guide ? `TAB DETAILS: ${guide.whatItIs}` : '',
    guide ? `WHEN TO USE THIS TAB: ${guide.whenToUse}` : '',
    (section ? (() => {
      const key = section.toLowerCase();
      if (LANDING_SECTIONS[key]) {
        const s = LANDING_SECTIONS[key];
        return `ACTIVE SECTION: ${s.label} — ${s.summary}\nSECTION DETAILS: ${s.details}`;
      }
      return `ACTIVE SECTION: ${section}`;
    })() : '')
  ].filter(Boolean);

  return `${WEBSITE_KNOWLEDGE}

CURRENT CHAT CONTEXT:
${contextLines.join('\n')}

RESPONSE RULES:
- Incutrack is a MARKETPLACE connecting founders with investors. Always answer from that framing.
- If the user asks about a specific tab or section, answer using the active context above.
- If the user asks what a tab is, explain it clearly and plainly, including who it's for.
- If the user asks how to use Incutrack, describe it as a marketplace where founders get discovered and investors source, evaluate, and deploy capital.
- Keep answers concise, helpful, and grounded in this knowledge base. If unsure, tell them to reach out to the Incutrack team.
`;
}
