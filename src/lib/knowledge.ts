export interface ChatContext {
  pathname?: string;
  tab?: string;
  section?: string;
}

export const WEBSITE_KNOWLEDGE = `
PLATFORM: Incutrack
TAGLINE: The common OS for startup founders and investors.

OVERVIEW:
Incutrack is a startup operating system that helps founders move from raw idea to shipped product, traction, fundraising readiness, and investor visibility. It combines planning, tracking, evidence collection, networking, and deal intelligence in one place so users do not need to juggle spreadsheets, notes, decks, and scattered tools.

WHAT INCUTRACK IS:
- A workspace for founders to manage ideas, execution, traction, and fundraising.
- A VC portal for investors to scout startups, review diligence materials, manage deal flow, and track opportunities.
- A growth layer for startup ecosystems, mentors, events, and communities to stay connected.

WHO IT BENEFITS:
- Founders: early-stage and growth-stage founders who want better visibility into progress and stronger fundraising readiness.
- Investors and VCs: professionals who want to discover startups, evaluate them, review documents, and manage opportunities.
- Ecosystem partners: mentors, accelerators, operators, and event organizers who need a structured way to engage with startups.

PRIMARY BENEFITS:
- Gives founders one place to track progress and traction.
- Helps turn ideas into structured execution with playbooks and next steps.
- Makes fundraising and investor communication more data-driven.
- Gives investors a centralized place to evaluate startups and monitor deals.
- Improves visibility across milestones, documents, events, and relationships.

CORE PLATFORM AREAS:
1. Founder Hub
   - A command center for startup founders.
   - Helps them monitor progress, track milestones, manage key docs, and stay aligned with growth goals.
   - Useful for founders who want to organize their journey from concept to traction.

2. Scout / VC Portal
   - A dedicated investor workspace with deal flow, diligence, network, insights, and deployment tools.
   - Helps investors evaluate startups using structured data and shared documents.
   - Supports discovery, screening, due diligence, and portfolio tracking.

3. Startup Intelligence and Evidence
   - Allows teams to upload and organize decks, documents, and evidence.
   - Helps founders and investors evaluate readiness, progress, and credibility.

4. Community and Network Layer
   - Supports events, founder introductions, mentor sessions, and relationship management.
   - Useful for both founders and investors looking to build trust and momentum.

HOW FOUNDERS SHOULD USE IT PROPERLY:
- Start by defining the startup concept, goals, and core traction metrics.
- Use the platform to capture progress regularly instead of relying on memory or scattered files.
- Keep documents, decks, and updates organized so fundraising conversations become easier.
- Review playbooks and milestones to ensure the company is building with focus.
- Use insights from the platform to understand what is working and what needs attention.

HOW INVESTORS SHOULD USE IT PROPERLY:
- Use Scout to discover startups that match sector, stage, and check size preferences.
- Review startup materials, diligence documents, and signals before moving forward.
- Track deal progress, evaluate readiness, and maintain a clear decision pipeline.
- Use network and event sections to build relationships and spot opportunities early.

TYPICAL USE CASES:
- A founder wants to track traction and prepare for their next funding round.
- A VC wants to review a startup's progress, docs, and market fit before investing.
- A startup team wants to organize materials for a pitch, diligence request, or mentor session.
- An investor wants to compare sectors, deal flow, and portfolio performance from one dashboard.

KEY WORDS TO KNOW:
- Traction: evidence that the startup is gaining momentum.
- Diligence: the review process for understanding a startup before making a decision.
- Deal flow: the pipeline of startups or opportunities under review.
- Scout: the investor-focused experience inside Incutrack.
- Hub: the founder-facing workspace for execution and visibility.

IMPORTANT POSITIONING:
Incutrack is not just a simple dashboard. It is an operating system that helps startups and investors make better decisions with clearer evidence and better organization.

FAQ:
Q: What is Incutrack?
A: Incutrack is a startup operating system for founders and investors that helps teams track progress, manage execution, organize documents, and improve fundraising and deal decisions.
Q: Who is Incutrack for?
A: It is built for startup founders, investors, VCs, mentors, and ecosystem partners.
Q: What does it help founders do?
A: It helps founders organize their journey from idea to product, track traction, review playbooks, and prepare for fundraising.
Q: What does it help investors do?
A: It helps investors discover startups, evaluate them, manage deal flow, review diligence materials, and track opportunities.
Q: How should I use it properly?
A: Use it as your operating layer for execution, evidence, and decision-making rather than as a passive storage space.
Q: Is it only for founders?
A: No. It also supports investors and ecosystem participants through the Scout experience.
`;

const TAB_GUIDE: Record<string, { label: string; summary: string; whatItIs: string; whenToUse: string }> = {
  cockpit: {
    label: 'Investment Cockpit',
    summary: 'A high-level overview of the investor workspace.',
    whatItIs: 'The Investment Cockpit is the main overview tab for investors. It shows a live snapshot of priorities, opportunities, pipeline movement, and important startup signals.',
    whenToUse: 'Use this tab when you want a quick, strategic overview of the current investment landscape.'
  },
  dealflow: {
    label: 'Deal Flow',
    summary: 'The pipeline of startups and opportunities under review.',
    whatItIs: 'Deal Flow is where investors review startups, filter matches, and move promising opportunities through the evaluation process.',
    whenToUse: 'Use this tab when you want to browse, screen, and organize startups in the investment pipeline.'
  },
  diligence: {
    label: 'Diligence',
    summary: 'The deep review and document evaluation workspace.',
    whatItIs: 'Diligence is for inspecting startup evidence, reviewing decks and materials, and understanding the quality and readiness of a company before moving forward.',
    whenToUse: 'Use this tab when you are reviewing documents, assessing readiness, and preparing a decision.'
  },
  network: {
    label: 'Startup Network',
    summary: 'The relationship and founder connection layer.',
    whatItIs: 'The Startup Network helps investors and founders discover and manage relationships, communications, and engagement with relevant people.',
    whenToUse: 'Use this tab when you want to explore founder relationships, contacts, and partnership opportunities.'
  },
  demodays: {
    label: 'Demo Days',
    summary: 'The events and showcase experience.',
    whatItIs: 'Demo Days is where startup showcases, events, and investor-facing sessions are surfaced so users can engage with upcoming opportunities.',
    whenToUse: 'Use this tab when you want to find events, sessions, or pitch moments.'
  },
  insights: {
    label: 'Insights',
    summary: 'The analytics and market intelligence workspace.',
    whatItIs: 'Insights highlights sector trends, deal performance, signals, and strategic data that help investors make more informed decisions.',
    whenToUse: 'Use this tab when you need data, trends, or market analysis.'
  },
  deployment: {
    label: 'Deployment',
    summary: 'The portfolio and capital deployment view.',
    whatItIs: 'Deployment is where invested startups, capital allocation, and funding progress are tracked in a structured way.',
    whenToUse: 'Use this tab when you want to understand funded deals, outcomes, and deployment progress.'
  },
  vcnetwork: {
    label: 'VC Network',
    summary: 'The investor network and partner discovery layer.',
    whatItIs: 'VC Network helps users discover and interact with other investors, firms, and partners relevant to the startup ecosystem.',
    whenToUse: 'Use this tab when you want to explore investor relationships or partner networks.'
  }
};

function normalizeTab(tab?: string) {
  return (tab || '').trim().toLowerCase();
}

export function getContextualKnowledge(context: ChatContext = {}) {
  const pathname = context.pathname || '';
  const tab = normalizeTab(context.tab);
  const section = context.section?.trim();

  const routeLabel = pathname.includes('/scout')
    ? 'Scout / VC portal'
    : pathname.includes('/hub')
      ? 'Founder Hub'
      : 'General website / landing experience';

  const contextLines = [
    `CURRENT VIEW: ${routeLabel}`,
    tab && TAB_GUIDE[tab]
      ? `ACTIVE TAB: ${TAB_GUIDE[tab].label} — ${TAB_GUIDE[tab].summary}`
      : 'ACTIVE TAB: None or unknown',
    tab && TAB_GUIDE[tab]
      ? `TAB DETAILS: ${TAB_GUIDE[tab].whatItIs}`
      : '',
    tab && TAB_GUIDE[tab]
      ? `WHEN TO USE THIS TAB: ${TAB_GUIDE[tab].whenToUse}`
      : '',
    section ? `ACTIVE SECTION: ${section}` : ''
  ].filter(Boolean);

  return `${WEBSITE_KNOWLEDGE}

CURRENT CHAT CONTEXT:
${contextLines.join('\n')}

RESPONSE RULES:
- If the user is asking about a specific tab or section, answer using the active context.
- If the user asks what a tab is, explain it clearly in plain language.
- If the user asks how to use Incutrack, describe it as a platform for founders and investors to organize execution, evidence, and decisions.
- Keep answers concise, helpful, and grounded in this knowledge base.
`;
}