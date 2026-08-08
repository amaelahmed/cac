const fs = require('fs');

async function test(name, payload) {
    console.log(`\n--- Test: ${name} ---`);
    try {
        const res = await fetch('http://localhost:8788/api/test-retrieval', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ biz: payload })
        });
        const data = await res.json();
        if (data.assemblyResult) {
            console.log(`Score: ${data.assemblyResult.confidence.score}`);
            console.log(`Status: ${data.assemblyResult.confidence.status}`);
            console.log(`Top Reasoning:`, data.assemblyResult.confidence.reasoning);
            // Check placeholders
            if (data.finalStrategy && data.finalStrategy["Common Mistakes"]) {
                console.log(`Placeholder Test (Mistakes):`, JSON.stringify(data.finalStrategy["Common Mistakes"]).substring(0, 100));
            }
        } else {
            console.log("No result returned");
        }
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await test("Generic Dental", { industry: "Dental Clinic", name: "Smile Bright" });
    
    await test("High End Cosmetic Dental", { industry: "Dental Clinic", name: "Elite Smiles", model: "B2C", type: "Offline", pricing: "Premium", service: "Cosmetic Dentistry" });

    await test("Start-up Dental Clinic", { industry: "Dental Clinic", name: "New Wave Dental", stage: "Pre-Launch", goal: "Lead Generation" });

    await test("Different Location", { industry: "Dental Clinic", name: "London Smiles", location: "London" });
    
    // Hair Salon Tests
    await test("Generic Hair Salon", { industry: "Hair Salon", name: "Luxe Locks" });
    await test("High End Hair Salon", { industry: "Hair Salon", name: "Beverly Hills Hair", pricing: "Premium" });
}

run();
