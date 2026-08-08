const http = require('http');

const PORT = 8788; // Assuming local wrangler dev server port

const testProfiles = [
    {
        name: "Restaurant",
        biz: { biz_industry: "Restaurant", biz_location: "Chicago", biz_audience: "Local Foodies", biz_stage: "Growth", biz_customer_model: "B2C", biz_ticket: "Medium", goal: "More bookings" }
    },
    {
        name: "SaaS",
        biz: { biz_industry: "Software", biz_audience: "Marketing Teams", biz_stage: "Growth", biz_revenue_model: "Subscription", biz_customer_model: "B2B", goal: "Reduce churn" }
    },
    {
        name: "AI Startup",
        biz: { biz_industry: "Technology", biz_offer: "AI Agents", biz_stage: "Idea", biz_customer_model: "B2B", biz_ticket: "High", goal: "Find Product Market Fit" }
    },
    {
        name: "Agency",
        biz: { biz_industry: "Consulting", biz_offer: "Design Services", biz_audience: "Tech Startups", biz_stage: "Established", biz_customer_model: "B2B", biz_ticket: "High" }
    },
    {
        name: "Creator",
        biz: { biz_industry: "Media", biz_offer: "Online Courses", biz_audience: "Designers", biz_stage: "Early Revenue", biz_customer_model: "B2C", biz_ticket: "Low" }
    },
    {
        name: "Open Source",
        biz: { biz_industry: "Software", biz_offer: "Developer Tools", biz_audience: "Engineers", biz_stage: "Growth", biz_customer_model: "B2D", goal: "Community Growth" }
    },
    {
        name: "Internal Tool",
        biz: { biz_industry: "Enterprise", biz_offer: "Workflow Automation", biz_audience: "Employees", biz_stage: "Established", biz_customer_model: "B2E" }
    },
    {
        name: "Marketplace",
        biz: { biz_industry: "E-commerce", biz_offer: "Two-sided platform", biz_audience: "Buyers and Sellers", biz_stage: "Early Revenue", biz_customer_model: "B2B2C" }
    },
    {
        name: "Enterprise",
        biz: { biz_industry: "Technology", biz_offer: "Infrastructure", biz_audience: "Fortune 500", biz_stage: "Mature", biz_customer_model: "B2B", biz_ticket: "Enterprise" }
    },
    {
        name: "D2C Brand",
        biz: { biz_industry: "Retail", biz_offer: "Skincare", biz_audience: "Gen Z", biz_stage: "Growth", biz_customer_model: "B2C", biz_ticket: "Medium", goal: "Increase ROAS" }
    }
, { name: "Unknown", biz: { biz_industry: "Space Mining", biz_audience: "Aliens", biz_stage: "Idea" } }];

async function runTests() {
    console.log("Running E2E Profile Tests...\n");
    let allPassed = true;

    for (const test of testProfiles) {
        console.log(`Testing Profile: ${test.name}`);
        try {
            const reqData = JSON.stringify({ biz: test.biz });
            
            const res = await fetch(`http://127.0.0.1:${PORT}/api/test-retrieval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: reqData
            });

            if (!res.ok) {
                console.error(`❌ HTTP Error: ${res.status}`);
                const text = await res.text();
                console.error(text);
                allPassed = false;
                continue;
            }

            const data = await res.json();
            
            if (data.error) {
                console.error(`❌ API Error: ${data.error}`);
                allPassed = false;
                continue;
            }

            if (!data.finalStrategy) {
                console.warn(`⚠️ Warning: No final strategy returned for ${test.name}. Lineage length: ${data.lineage?.length}, Modules count: ${data.modulesCount}`);
            } else {
                console.log(`✅ Success for ${test.name}! Strategy assembled with confidence: ${data.assemblyResult?.confidence?.score}`);
            }
            if (data.assemblyResult?.confidence) {
                console.log(JSON.stringify(data.assemblyResult.confidence, null, 2));
            }

        } catch (err) {
            console.error(`❌ Fetch Error for ${test.name}:`, err.message);
            allPassed = false;
        }
        console.log("-".repeat(40));
    }

    if (allPassed) {
        console.log("\n🎉 All E2E Profile tests completed without exceptions.");
    } else {
        console.log("\n❌ Some tests failed.");
    }
}

runTests();
