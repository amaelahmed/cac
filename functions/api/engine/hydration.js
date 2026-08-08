/**
 * Hydrates an intelligence pack strategy with user-specific data.
 * @param {string} rawJsonString - The raw JSON string containing placeholders.
 * @param {object} user - The user data object containing actual values.
 * @returns {object} - The hydrated JSON object.
 */
export function hydrateStrategy(rawJsonString, user) {
  if (!rawJsonString) return null;

  const data = {
    businessName: user.identity?.name || 'Your Business',
    location: user.market?.location || 'Your Location',
    city: String(user.market?.location || 'Your Location').split(',')[0].trim() || 'Your Location',
    audience: user.customers?.audience || 'Your Target Audience',
    customerModel: user.customers?.model || 'Your Customer Model',
    priceRange: user.offering?.averageTicket || 'Your Price Range',
    industry: user.market?.industry || 'Your Industry',
    offer: user.offering?.coreOffer || user.offering?.service || 'Your Offer',
    usp: user.offering?.usp || 'Your Advantage',
    advantage: user.offering?.usp || 'Your Advantage',
    problem: user.customers?.challenge || 'Your Main Problem',
    goal: Array.isArray(user.objectives?.goals) && user.objectives.goals.length ? user.objectives.goals.join(', ') : (user.objectives?.goals || 'Your Goal'),
    stage: user.identity?.stage || 'Your Stage',
    platform: Array.isArray(user.channels?.platforms) && user.channels.platforms.length ? user.channels.platforms[0] : 'Your Main Platform',
    revenueModel: user.economics?.revenueModel || 'Your Revenue Model',
    operatingModel: user.identity?.type || 'Your Operating Model',
  };

  try {
    const parsed = JSON.parse(rawJsonString);
    const hydrateValue = (value) => {
      if (typeof value === 'string') {
        return value
          .replace(/\{\{BUSINESS_NAME\}\}/g, data.businessName)
          .replace(/\{\{LOCATION\}\}/g, data.location)
          .replace(/\{\{CITY\}\}/g, data.city)
          .replace(/\{\{TARGET_AUDIENCE\}\}/g, data.audience)
          .replace(/\{\{AUDIENCE\}\}/g, data.audience)
          .replace(/\{\{PRICE_RANGE\}\}/g, data.priceRange)
          .replace(/\{\{INDUSTRY\}\}/g, data.industry)
          .replace(/\{\{OFFER\}\}/g, data.offer)
          .replace(/\{\{USP\}\}/g, data.usp)
          .replace(/\{\{ADVANTAGE\}\}/g, data.advantage)
          .replace(/\{\{PROBLEM\}\}/g, data.problem)
          .replace(/\{\{GOAL\}\}/g, data.goal)
          .replace(/\{\{STAGE\}\}/g, data.stage)
          .replace(/\{\{PLATFORM\}\}/g, data.platform)
          .replace(/\{\{CUSTOMER_MODEL\}\}/g, data.customerModel)
          .replace(/\{\{REVENUE_MODEL\}\}/g, data.revenueModel)
          .replace(/\{\{OPERATING_MODEL\}\}/g, data.operatingModel);
      }
      if (Array.isArray(value)) return value.map(hydrateValue);
      if (value && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, hydrateValue(child)]));
      }
      return value;
    };

    return hydrateValue(parsed);
  } catch (error) {
    console.error("Hydration parsing error:", error);
    throw new Error("Failed to parse hydrated strategy JSON.");
  }
}
