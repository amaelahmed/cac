export class BusinessProfileBuilder {
    static normalizeIndustry(value) {
        const raw = String(value || '').trim();
        const lower = raw.toLowerCase();
        if (!raw || lower === 'other') return 'Generic Business';

        const aliases = [
            [/caf[e\u00e9]|coffee|tea shop|juice bar|work-from-cafe/, 'Cafe'],
            [/restaurant|dine|food & beverage|cloud kitchen|delivery food|tiffin|meal box|bakery|sweets|catering|food truck|street food/, 'Restaurant'],
            [/gym|fitness|yoga|pilates|wellness studio/, 'Gym'],
            [/real estate|property/, 'Real Estate'],
            [/dental/, 'Dental Clinic'],
            [/salon|barber|hair/, 'Hair Salon'],
            [/beauty|makeup|spa|nail|skin clinic|aesthetic/, 'Hair Salon'],
            [/software|saas|micro[-\s]?saas|mobile app|consumer app|developer tool|app subscription|ai tool|ai app|vibe coded|vibecoded|no-code|nocode|edtech|online course/, 'Software'],
            [/tuition|education|school|academy|teacher|learning centre|learning center|study centre|study center|coaching centre|coaching center|exam class|training institute/, 'Education'],
            [/creator|media|newsletter|publication|podcast|youtube channel|influencer|content business|community-led media/, 'Media'],
            [/e-commerce|ecommerce|d2c|amazon|retail|boutique|clothing|fashion|grocery|supermarket|electronics|mobile store|jewellery|accessories|gift|decor|furniture|stationery|books|toys|sports|pharmacy/, 'Retail'],
            [/consulting|coaching|training|agency|accounting|ca \/ accounting|legal|advocate|photography|videography|event|interior|architecture|travel|hotel|homestay|auto|cleaning|laundry|repair|maintenance|logistics|delivery service|manufacturing|b2b supply|contractor/, 'Consulting'],
            [/clinic|physician|veterinary|diagnostic|healthcare|wellness|ayurveda|alternative wellness|pet care|grooming/, 'Healthcare']
        ];

        const match = aliases.find(([pattern]) => pattern.test(lower));
        return match ? match[1] : raw;
    }

    static normalizeType(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (lower.includes('hybrid') || lower.includes('online + physical')) return 'Hybrid';
        if (lower.includes('saas') || lower.includes('app') || lower.includes('online') || lower.includes('creator') || lower.includes('media')) return 'Online';
        if (lower.includes('local physical') || lower.includes('walk-in') || lower.includes('physical') || lower.includes('dine-in') || lower.includes('home-based') || lower.includes('franchise')) return 'Offline';
        if (lower.includes('delivery') || lower.includes('customer location') || lower.includes("customer's home")) return 'Hybrid';
        return value;
    }

    static normalizePricing(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (lower.includes('under') || lower.includes('zero') || lower.includes('500') || lower.includes('budget') || lower.includes('affordable')) return 'Budget';
        if (lower.includes('50,000+') || lower.includes('50 lakh') || lower.includes('premium') || lower.includes('highest quality') || lower.includes('high-income')) return 'Premium';
        if (lower.includes('10,000') || lower.includes('15,000') || lower.includes('50,000') || lower.includes('mid')) return 'Mid-Market';
        return value;
    }

    static normalizeGoal(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (['awareness', 'brand awareness'].includes(lower) || lower.includes('awareness')) return 'Increase Awareness';
        if (['customers', 'online_sales'].includes(lower) || lower.includes('lead') || lower.includes('customer') || lower.includes('sales')) return 'Increase Footfall';
        if (lower.includes('retention') || lower.includes('return')) return 'Increase Retention';
        if (lower.includes('credibility') || lower.includes('trust')) return 'Build Trust';
        if (lower.includes('launch')) return 'Increase Awareness';
        if (lower.includes('premium') || lower.includes('aov')) return 'Increase AOV';
        return value;
    }

    static normalizeModel(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (lower.includes('b2b') && lower.includes('b2c')) return 'Both B2B & B2C';
        if (lower.includes('b2b')) return 'B2B';
        if (lower.includes('b2c') || lower.includes('d2c') || lower.includes('consumer')) return 'B2C';
        if (lower.includes('developer')) return 'B2D';
        if (lower.includes('creator') || lower.includes('media')) return 'Creator';
        if (lower.includes('marketplace')) return 'Marketplace';
        return value;
    }

    static normalizeStage(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (lower.includes('not launched') || lower.includes('idea') || lower.includes('validation') || lower.includes('pre-product') || lower.includes('pre-launch')) return 'Idea';
        if (lower.includes('just opened') || lower.includes('just launched') || lower.includes('first customers') || lower.includes('mvp') || lower.includes('prototype') || lower.includes('beta')) return 'Startup';
        if (lower.includes('early revenue') || lower.includes('inconsistent') || lower.includes('growing steadily') || lower.includes('growth') || lower.includes('scaling')) return 'Growth';
        if (lower.includes('established') || lower.includes('improving') || lower.includes('expanding') || lower.includes('branch') || lower.includes('new market') || lower.includes('mature')) return 'Mature';
        return value;
    }

    static normalizeChallenge(value) {
        const lower = String(value || '').toLowerCase();
        if (!lower) return 'ANY';
        if (lower.includes('lead') || lower.includes('enquir')) return 'Lead Gen';
        if (lower.includes('conversion') || lower.includes('sales')) return 'Conversion';
        if (lower.includes('retention') || lower.includes("don't return")) return 'Retention';
        if (lower.includes('awareness')) return 'Awareness';
        if (lower.includes('premium') || lower.includes('pricing')) return 'Pricing';
        if (lower.includes('competition')) return 'Competition';
        if (lower.includes('engagement')) return 'Engagement';
        return value;
    }

    static normalizeGoals(value) {
        if (Array.isArray(value)) return value.map(goal => BusinessProfileBuilder.normalizeGoal(goal));
        return BusinessProfileBuilder.normalizeGoal(value);
    }

    static deepFreeze(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        Object.keys(obj).forEach(prop => {
            BusinessProfileBuilder.deepFreeze(obj[prop]);
        });
        return Object.freeze(obj);
    }

    static build(rawBizPayload) {
        if (!rawBizPayload) return null;
        
        const profile = {
            _schemaVersion: 1,
            identity: {
                name: rawBizPayload.biz_name || rawBizPayload.name || 'Your Business',
                type: BusinessProfileBuilder.normalizeType(rawBizPayload.biz_type || rawBizPayload.type),
                teamSize: rawBizPayload.biz_team || 'ANY',
                age: rawBizPayload.biz_age || 'ANY',
                stage: BusinessProfileBuilder.normalizeStage(rawBizPayload.biz_stage || rawBizPayload.stage)
            },
            market: {
                industry: BusinessProfileBuilder.normalizeIndustry(rawBizPayload.biz_industry || rawBizPayload.industry || rawBizPayload.business_type),
                location: rawBizPayload.biz_location || rawBizPayload.location || 'ANY'
            },
            offering: {
                coreOffer: rawBizPayload.biz_offer || 'ANY',
                usp: rawBizPayload.biz_usp || 'ANY',
                averageTicket: BusinessProfileBuilder.normalizePricing(rawBizPayload.biz_ticket || rawBizPayload.pricing || rawBizPayload.biz_usp),
                service: rawBizPayload.service || 'ANY' // Fallback for legacy
            },
            customers: {
                model: BusinessProfileBuilder.normalizeModel(rawBizPayload.biz_customer_model || rawBizPayload.model),
                audience: rawBizPayload.biz_audience || rawBizPayload.audience || 'ANY',
                challenge: BusinessProfileBuilder.normalizeChallenge(rawBizPayload.biz_challenge || rawBizPayload.challenge)
            },
            economics: {
                revenue: rawBizPayload.biz_revenue || 'ANY',
                revenueModel: rawBizPayload.biz_revenue_model || 'ANY',
                marketingBudget: rawBizPayload.biz_budget || 'ANY',
                size: rawBizPayload.size || 'ANY' // Fallback for legacy
            },
            brand: {
                personality: rawBizPayload.biz_personality || 'ANY',
                language: 'Simple English',
                colors: []
            },
            channels: {
                platforms: rawBizPayload.platforms || [],
                website: rawBizPayload.biz_website || null,
                competitorWebsite: rawBizPayload.biz_comp_website || null,
                instagramFollowers: rawBizPayload.biz_followers || 'ANY',
                ownWebsiteSnapshot: rawBizPayload.own_website_snapshot || null,
                competitorWebsiteSnapshot: rawBizPayload.competitor_website_snapshot || null
            },
            objectives: {
                goals: BusinessProfileBuilder.normalizeGoals(rawBizPayload.goal)
            },
            // Legacy mapping for easy backward compatibility if needed in deep components
            maturity: rawBizPayload.maturity || 'ANY'
        };
        
        return BusinessProfileBuilder.deepFreeze(profile);
    }
}
