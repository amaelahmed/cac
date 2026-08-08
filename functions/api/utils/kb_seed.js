const { v4: uuidv4 } = require('uuid');

const templates = [
  {
    category: 'calendar',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { day: 1, format: "Reel", platform: "Instagram", hook: "The 3 biggest mistakes people make when looking for a {{BUSINESS_NAME}}", visual: "Speaking directly to camera with text overlay", value: "Educational tips showing expertise in {{CITY}}" },
      { day: 2, format: "Carousel", platform: "LinkedIn/Facebook", hook: "Why we started {{BUSINESS_NAME}} in {{CITY}}", visual: "Team photo or storefront", value: "Building trust and local connection" },
      { day: 3, format: "Story", platform: "Instagram", hook: "Behind the scenes at {{BUSINESS_NAME}}", visual: "Quick video of daily operations", value: "Transparency and engagement" },
      { day: 4, format: "Post", platform: "All", hook: "Client Spotlight: How we helped {{TARGET_AUDIENCE}}", visual: "Happy customer photo", value: "Social proof" },
      { day: 5, format: "Short", platform: "TikTok/YouTube", hook: "1 Quick hack for {{TARGET_AUDIENCE}}", visual: "Actionable demonstration", value: "Instant value" }
    ])
  },
  {
    category: 'strategies',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { name: "Local Partnership Core", description: "Partner with adjacent businesses in {{CITY}} to cross-promote.", timeline: "Week 1", impact: "High", effort: "Medium", steps: ["Identify 3 local non-competing businesses targeting {{TARGET_AUDIENCE}}", "Propose a joint giveaway", "Launch on social media"], tools: ["Instagram", "Email"], kpis: { metric: "50+ new local leads" } },
      { name: "Hyper-Local SEO Setup", description: "Dominate search results when people in {{CITY}} search for your services.", timeline: "Week 2", impact: "High", effort: "Low", steps: ["Claim Google Business Profile", "Ensure {{CITY}}, {{STATE}} is prominent in bio", "Request 5 reviews from past clients"], tools: ["Google Business"], kpis: { metric: "+20% organic traffic" } }
    ])
  },
  {
    category: 'roadmap',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { week: "Week 1-2", phase: "Foundation & Local Presence", actions: ["Optimize Google Business Profile for {{CITY}}", "Launch first 5 content pieces"] },
      { week: "Week 3-4", phase: "Partnerships & Outreach", actions: ["Contact 3 local partners", "Run a joint promotion targeting {{TARGET_AUDIENCE}}"] }
    ])
  },
  {
    category: 'pain_points',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { icon: "😩", title: "Finding reliable services in {{CITY}}", description: "{{TARGET_AUDIENCE}} struggle to trust new businesses.", solution: "Showcase raw, authentic behind-the-scenes content.", content_angle: "Trust-building Reel" },
      { icon: "💸", title: "Fear of wasting money", description: "They want to know {{BUSINESS_NAME}} is worth the investment.", solution: "Highlight clear ROI and testimonials.", content_angle: "Case Study Post" }
    ])
  },
  {
    category: 'client_personas',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { name: "Local Localizer", type: "Resident of {{CITY}}", objections: ["Is it too far?", "Do I know anyone who goes here?"], pitch_strategy: "Emphasize community connection and local convenience." },
      { name: "Value Seeker", type: "{{TARGET_AUDIENCE}} on a budget", objections: ["Is the price justified?"], pitch_strategy: "Focus on long-term benefits and quality over cheapness." }
    ])
  },
  {
    category: 'psychology_breakdown',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { principle: "Social Proof", description: "People in {{CITY}} follow the crowd.", application: "Always feature real faces of your customers." },
      { principle: "Scarcity", description: "Limited availability increases desire.", application: "Offer a 'First 10 customers' special." }
    ])
  },
  {
    category: 'ideas',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { category: "Digital", title: "{{CITY}} Resident Discount", description: "Offer a special incentive for locals.", effort: "Low", potential: "High", roi_estimate: "Immediate foot traffic", steps: ["Create graphic", "Post on local Facebook groups"] },
      { category: "Physical", title: "Sidewalk Signage", description: "Capture foot traffic near {{BUSINESS_NAME}}.", effort: "Low", potential: "Medium", roi_estimate: "5-10 walk-ins per week", steps: ["Design sign", "Place outside"] }
    ])
  },
  {
    category: 'premium_growth',
    business_type: 'Generic',
    content_json: JSON.stringify([
      { id: "pg1", title: "The {{CITY}} Domination Playbook", what_is_wrong: "Relying purely on word of mouth.", why_is_it_happening: "Lack of predictable lead generation.", start_today: [{what:"Claim GBP", why:"Visibility", how:"Google", expected:"More calls"}], next_7_days: [{what:"Gather 5 reviews", why:"Trust", how:"Email past clients", expected:"Better conversion"}], next_30_days: [{what:"Run local ads", why:"Scale", how:"Meta Ads", expected:"Consistent leads"}] }
    ])
  }
];

// Provide an easy copy-paste SQL block for inserting these into D1
let sql = "";
templates.forEach(t => {
  const id = uuidv4();
  const escapedJson = t.content_json.replace(/'/g, "''"); // Escape single quotes for SQL
  sql += `INSERT INTO kb_templates (id, category, business_type, region, content_json) VALUES ('${id}', '${t.category}', '${t.business_type}', 'Global', '${escapedJson}');\n`;
});

console.log(sql);
