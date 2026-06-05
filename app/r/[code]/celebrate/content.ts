// Fixed copy for the Celebrate page — the 3 story tiles, 4 stat tiles,
// and their respective expand-on-click detail panels. Lifted verbatim
// from reference/cx-engagement-app.html (STORIES + STATS_DETAIL).
//
// COLOR REFERENCES use the participant palette index (lib/colors.ts):
//   0 = magenta, 1 = navy, 2 = cobalt, 3 = amber, 4 = lavender.

export type Story = {
  id: string;
  colorIdx: 0 | 1 | 2 | 3 | 4;
  type: string;
  title: string;
  subtitle: string;
  detail: string;
};

export const STORIES: ReadonlyArray<Story> = [
  {
    id: "s1",
    colorIdx: 0,
    type: "SUCCESS STORY",
    title: "L&D: Equipping the field to show up better",
    subtitle: "4 Early Experience Teams in flight",
    detail:
      "Transformation of the L&D team to productize where appropriate while maintaining specialized expertise. Field-facing teams get more consistent, timely learning. Axonify delivers just-in-time micro-learning (~13% knowledge growth) and is being piloted across oncology MSLs and Global/EU teams. CRM applies adult learning principles to embed learning into workflows — making it practical and usable for the field, beyond a tracking tool.",
  },
  {
    id: "s2",
    colorIdx: 2,
    type: "SUCCESS STORY",
    title: "From static research to AI-enabled insights",
    subtitle: "10 Jumpstarts & experiments proving successful",
    detail:
      "2-week sprint with 26 members of US Epidiolex team. AI chatbot layered on existing market research library. Marketers can access, connect, and apply insights more easily. Lessons: adoption requires intention not just access; ease of use isn't the barrier — guiding when and why to use it is. Trust must be actively shaped.",
  },
  {
    id: "s3",
    colorIdx: 4,
    type: "LEARNING STORY",
    title: "Fail fast, build better: pressure-testing the future operating model",
    subtitle: "2 Learning stories",
    detail:
      "Sam O ran a pilot workshop with closely connected workstreams to pressure-test future ways of working. The session sparked valuable cross-workstream discussion. Learning: more structure upfront, single pre-aligned scenario, light pre-work to surface assumptions. Next time, anchor on one clear scenario in advance.",
  },
] as const;

export type StatItem = { name: string; desc: string };
export type Stat = {
  id: string;
  num: string;
  label: string;
  sub?: string;
  colorIdx: 0 | 1 | 2 | 3 | 4;
  items: StatItem[];
};

export const STATS: ReadonlyArray<Stat> = [
  {
    id: "completed",
    num: "4",
    label: "Experiments completed",
    colorIdx: 0,
    items: [
      { name: "FUSE AI-enabled chat bot",       desc: "AI layer on the market research library to help marketers work smarter and adopt AI in their daily workflow." },
      { name: "KAM360 benchmarking",            desc: "Full review of Key Account Management at Jazz to shape the future KAM role." },
      { name: "Redefining interactions with KOLs", desc: "New trusted materials and a better outreach approach at congresses." },
      { name: "KOL tactical planning",          desc: "Aligned Commercial and R&D teams on KOL engagement at conferences." },
    ],
  },
  {
    id: "kickedoff",
    num: "12",
    label: "Experiments kicked off",
    sub: "4/12 prioritized for Q2",
    colorIdx: 2,
    items: [
      { name: "Jazz Patient & Caregiver Forum",   desc: "Refreshed P&C forum spotlighting stories from Jazz employees." },
      { name: "Key Account Excellence (Sleep)",   desc: "Sleep field teams set their own account goals — shifting from activity to impact." },
      { name: "Sleep Patient Committee",          desc: "Cross-indication patient committee to bring real patient voices into Jazz work." },
      { name: "HCP Digital Visualization Aid",    desc: "Field teams from paper to digital engagement tools." },
    ],
  },
  {
    id: "planned",
    num: "18",
    label: "Experiments planned",
    colorIdx: 3,
    items: [
      { name: "HCP",     desc: "Aligned footprints, optimized TL advocacy, education in NPP environment, sleep targeting & segmentation." },
      { name: "Patient", desc: "Pre-RX mentor program (EMD), pre-RX field nurse educator program (Sleep), patient experience champion, EMD scorecard." },
      { name: "KOL",     desc: "Digital KOL, KOL Ninja, Unified Congress Strategy, Rapid Strategy Cycles, Journey-Anchored Sprint." },
      { name: "FUSE",    desc: "Global Marketing Office, Shared KPI Accountability, Journey Pod Activation." },
    ],
  },
  {
    id: "involved",
    num: "50+",
    label: "Jazzicians actively involved",
    colorIdx: 4,
    items: [
      {
        name: "The crew",
        desc:
          "Sunny Goyal, Jonathan Hayden, Adelpha Larkin, John Stabile, Greg Rechtenbach, Patrick Koch, Carolyn Schwartz, Chris Weichel, Dave Tworek, Craig Readler, Galina Perel, LeAnn Ledweg, Sonya Taylor, Mandy Breckbill, Greg Wedemeyer, Edouard Lasalle, Jeff Allen, Chad Pulliam, Mike Sargent, Brandon Shaffer, Diana Diomede, Geraldine Passemard, Julia Altenberger, Sarah McMann, Arnela Alickovic, Isadora Patrizi, Megan Reilly, Brent Weakley, Martin Harris, Liz Cohen, Brad Thompson, Monica Beckholt, Victoria Berenholz, Ray Ledford, Shari Kulkis, Lydia Wall, Amy Haines, Mehmet Dincer, Danielle Henek, Heather Hawes, Genna Burton, Kate Kitsopoulos, Tony Calucchia, Ethan Fingerman, Anjali Zaffuto.",
      },
    ],
  },
] as const;
