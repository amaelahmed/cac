const fs = require('fs');

let content = fs.readFileSync('src/app/details/page.tsx', 'utf8');

// Find the start and end of the form area
const startMarker = "{/* ── SECTION: Business ── */}";
const endMarker = "{/* ── CTA ── */}";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error("Markers not found");
    process.exit(1);
}

// Rebuild the HTML form part
const newFormContent = `
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                {/* 1. Name & Industry */}
                <div>
                  <label htmlFor="biz_name" className={labelBase}>Business Name *</label>
                  <input id="biz_name" type="text" placeholder="e.g. Spice Route Kitchen" onChange={handleChange} value={formData.biz_name} className={inputBase} />
                </div>
                <div>
                  <label htmlFor="biz_industry" className={labelBase}>Industry / Niche *</label>
                  <select id="biz_industry" onChange={handleChange} value={formData.biz_industry} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select your industry…</option>
                    <optgroup label="Food & Beverage">
                      <option>Restaurant / Café</option>
                      <option>Cloud Kitchen / Delivery</option>
                      <option>Bakery / Sweets Shop</option>
                      <option>Juice Bar / Tea Shop</option>
                      <option>Catering Service</option>
                      <option>Food Truck / Street Food</option>
                      <option>Tiffin / Meal Box Service</option>
                    </optgroup>
                    <optgroup label="Beauty & Wellness">
                      <option>Hair Salon / Barbershop</option>
                      <option>Beauty Parlour / Makeup Studio</option>
                      <option>Spa & Massage Center</option>
                      <option>Nail Studio</option>
                      <option>Fitness Center / Gym</option>
                      <option>Yoga / Pilates Studio</option>
                      <option>Skin Clinic / Aesthetic Center</option>
                      <option>Ayurveda / Alternative Health</option>
                    </optgroup>
                    <optgroup label="Retail">
                      <option>Clothing / Fashion Boutique</option>
                      <option>Grocery / Supermarket</option>
                      <option>Electronics / Mobile Shop</option>
                      <option>Jewellery / Accessories Store</option>
                      <option>Gift Shop / Home Decor</option>
                      <option>Stationery / Books / Toys</option>
                      <option>Sports & Outdoor Gear</option>
                      <option>Pharmacy / Medical Store</option>
                    </optgroup>
                    <optgroup label="Services">
                      <option>Photography / Videography</option>
                      <option>Event Planning / Decoration</option>
                      <option>Interior Design / Architecture</option>
                      <option>Coaching / Tutoring / Training</option>
                      <option>Digital Marketing Agency</option>
                      <option>IT Services / Web Design</option>
                      <option>Accounting / CA Services</option>
                      <option>Legal / Advocate Services</option>
                      <option>Real Estate / Property</option>
                      <option>Travel Agency / Tourism</option>
                      <option>Auto Repair / Garage</option>
                      <option>Cleaning / Home Services</option>
                      <option>Logistics / Courier</option>
                    </optgroup>
                    <optgroup label="Healthcare">
                      <option>Clinic / General Physician</option>
                      <option>Dental Clinic</option>
                      <option>Veterinary Clinic</option>
                      <option>Diagnostic Center / Lab</option>
                    </optgroup>
                    <optgroup label="Education">
                      <option>School / Tuition Center</option>
                      <option>Language / Spoken English Institute</option>
                      <option>Art / Music / Dance Academy</option>
                      <option>Online Course / EdTech</option>
                      <option>Driving School</option>
                    </optgroup>
                    <option value="other">Other (I'll describe below)</option>
                  </select>
                </div>

                {/* 2. Type & Age */}
                <div>
                  <label htmlFor="biz_type" className={labelBase}>Business Type *</label>
                  <select id="biz_type" onChange={handleChange} value={formData.biz_type} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Walk-in / Physical Store / Dine-in</option>
                    <option>Home-based Business</option>
                    <option>Online Only</option>
                    <option>Online + Physical (Hybrid)</option>
                    <option>Delivery / Service at Customer's Home</option>
                    <option>B2B (Business to Business)</option>
                    <option>Franchise / Chain</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_age" className={labelBase}>Years in Business *</label>
                  <select id="biz_age" onChange={handleChange} value={formData.biz_age} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Pre-launch (not open yet)</option>
                    <option>Less than 6 months</option>
                    <option>6 months – 1 year</option>
                    <option>1–3 years</option>
                    <option>3–5 years</option>
                    <option>5–10 years</option>
                    <option>10+ years (established brand)</option>
                  </select>
                </div>

                {/* 3. Location & Team */}
                {showLocation && (
                  <div>
                    <label htmlFor="biz_location" className={labelBase}>City / Location *</label>
                    <input id="biz_location" type="text" placeholder="e.g. Kozhikode, Kerala" onChange={handleChange} value={formData.biz_location} className={inputBase} />
                  </div>
                )}
                <div>
                  <label htmlFor="biz_team" className={labelBase}>Team Size *</label>
                  <select id="biz_team" onChange={handleChange} value={formData.biz_team} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Just me (solopreneur)</option>
                    <option>2–5 people</option>
                    <option>6–15 people</option>
                    <option>16–50 people</option>
                    <option>50+ people</option>
                  </select>
                </div>

                {/* 4. Budget & Followers */}
                <div>
                  <label htmlFor="biz_budget" className={labelBase}>Marketing Budget (monthly) *</label>
                  <select id="biz_budget" onChange={handleChange} value={formData.biz_budget} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Zero (organic only)</option>
                    <option>Under ₹5,000</option>
                    <option>₹5,000 – ₹15,000</option>
                    <option>₹15,000 – ₹50,000</option>
                    <option>₹50,000 – ₹2 Lakh</option>
                    <option>₹2 Lakh+</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_followers" className={labelBase}>Instagram Followers *</label>
                  <select id="biz_followers" onChange={handleChange} value={formData.biz_followers} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Not on Instagram yet</option>
                    <option>0 – 500</option>
                    <option>500 – 2,000</option>
                    <option>2,000 – 10,000</option>
                    <option>10,000 – 50,000</option>
                    <option>50,000+</option>
                  </select>
                </div>

                {/* 5. Revenue & Ticket */}
                <div>
                  <label htmlFor="biz_revenue" className={labelBase}>Revenue (monthly) *</label>
                  <select id="biz_revenue" onChange={handleChange} value={formData.biz_revenue} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Startup (Pre-revenue / 0)</option>
                    <option>Below ₹50,000</option>
                    <option>₹50K – ₹1 Lakh</option>
                    <option>₹1 – ₹3 Lakh</option>
                    <option>₹3 – ₹10 Lakh</option>
                    <option>₹10 – ₹50 Lakh</option>
                    <option>₹50 Lakh+</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_ticket" className={labelBase}>Average Transaction *</label>
                  <select id="biz_ticket" onChange={handleChange} value={formData.biz_ticket} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select…</option>
                    <option>Under ₹200</option>
                    <option>₹200–₹500</option>
                    <option>₹500–₹2,000</option>
                    <option>₹2,000–₹10,000</option>
                    <option>₹10,000–₹50,000</option>
                    <option>₹50,000+</option>
                  </select>
                </div>

                {/* 6. Language & Personality */}
                <div>
                  <label htmlFor="biz_language" className={labelBase}>Content Language *</label>
                  <select id="biz_language" onChange={handleChange} value={formData.biz_language} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option>English</option>
                    <option>Malayalam + English (Manglish)</option>
                    <option>Hindi + English (Hinglish)</option>
                    <option>Tamil + English</option>
                    <option>Telugu + English</option>
                    <option>Kannada + English</option>
                    <option>Marathi + English</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_personality" className={labelBase}>Brand Personality *</label>
                  <select id="biz_personality" onChange={handleChange} value={formData.biz_personality} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select closest match…</option>
                    <option>Warm & Friendly (trusted neighbour feel)</option>
                    <option>Professional & Premium (5-star hotel feel)</option>
                    <option>Fun & Playful (Gen-Z, vibrant energy)</option>
                    <option>Bold & Confident (market leader feel)</option>
                    <option>Traditional & Authentic (heritage brand)</option>
                    <option>Modern & Minimal (design-forward)</option>
                    <option>Passionate & Story-driven (founder-led brand)</option>
                  </select>
                </div>

                {/* 7. Website & Competitor */}
                <div>
                  <label htmlFor="biz_website" className={labelBase}>Your Website URL (Optional)</label>
                  <input id="biz_website" autoComplete="off" type="url" placeholder="https://www.yourbusiness.com" onChange={handleChange} value={formData.biz_website} className={inputBase} />
                </div>
                <div>
                  <label htmlFor="biz_comp_website" className={labelBase}>Competitor's Website (Optional)</label>
                  <input id="biz_comp_website" autoComplete="off" type="url" placeholder="https://www.competitor.com" onChange={handleChange} value={formData.biz_comp_website} className={inputBase} />
                </div>

                {/* 8. Offer & USP */}
                <div>
                  <label htmlFor="biz_offer" className={labelBase}>What do you sell? *</label>
                  <select id="biz_offer" onChange={handleChange} value={formData.biz_offer} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select an option…</option>
                    <option>Physical Products (Retail, E-commerce)</option>
                    <option>Digital Products (E-books, Courses, Software)</option>
                    <option>Professional Services (Consulting, Agency, B2B)</option>
                    <option>Personal Services (Salon, Fitness, Coaching)</option>
                    <option>Food & Beverage (Restaurant, Cafe, Delivery)</option>
                    <option>Real Estate & Property</option>
                    <option>Healthcare & Wellness</option>
                    <option>Events & Entertainment</option>
                    <option>Other / Custom offering</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_usp" className={labelBase}>Your USP *</label>
                  <select id="biz_usp" onChange={handleChange} value={formData.biz_usp} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select an option…</option>
                    <option>Highest Quality / Premium Experience</option>
                    <option>Most Affordable / Best Value</option>
                    <option>Fastest Delivery / Speed of Service</option>
                    <option>Exceptional Customer Service & Care</option>
                    <option>Highly Specialized / Niche Expertise</option>
                    <option>Eco-Friendly / Sustainable Practices</option>
                    <option>Strong Local Heritage / Legacy Brand</option>
                    <option>Unique / Innovative Product Features</option>
                  </select>
                </div>

                {/* 9. Audience & Challenge */}
                <div>
                  <label htmlFor="biz_audience" className={labelBase}>Ideal Customer *</label>
                  <select id="biz_audience" onChange={handleChange} value={formData.biz_audience} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select an option…</option>
                    <option>Gen-Z & Students (18-24)</option>
                    <option>Millennials / Young Professionals (25-40)</option>
                    <option>Parents & Families</option>
                    <option>Middle-aged Professionals (41-55)</option>
                    <option>Seniors / Retirees (55+)</option>
                    <option>Other Businesses (B2B / Founders)</option>
                    <option>High-Income Individuals (Premium/Luxury)</option>
                    <option>General Public / Mass Market</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="biz_challenge" className={labelBase}>Biggest Challenge *</label>
                  <select id="biz_challenge" onChange={handleChange} value={formData.biz_challenge} className={selectBase} style={{ backgroundImage: \`url("\${selectArrow}")\` }}>
                    <option value="">Select an option…</option>
                    <option>Not getting enough leads or enquiries</option>
                    <option>Low brand awareness (nobody knows us)</option>
                    <option>Poor social media engagement & growth</option>
                    <option>Fierce local competition taking our customers</option>
                    <option>Customers buy once but don't return (low retention)</option>
                    <option>Low conversion rates (traffic but no sales)</option>
                    <option>Struggling to justify premium pricing</option>
                  </select>
                </div>

                {/* 10. Platforms & Goals */}
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelBase}>Platforms you use *</label>
                    <div className="flex flex-wrap gap-1" id="platforms">
                      {['Instagram', 'Facebook', 'WhatsApp', 'YouTube', 'Google Biz', 'LinkedIn', 'Website', 'Zomato/Swiggy', 'Amazon', 'None'].map(platform => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={\`px-2.5 py-1 text-[11px] rounded-sm border transition-all duration-150 cursor-pointer \${
                            platforms.includes(platform)
                              ? 'bg-[var(--color-brand-accent)] text-black border-[var(--color-brand-accent)] font-semibold'
                              : 'bg-black/[0.02] dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-black/60 dark:text-white/60 hover:border-black/20 dark:hover:border-white/25'
                          }\`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className={labelBase}>Brand Colours</label>
                    <div className="flex gap-2 items-center">
                      {bcolors.map((color, idx) => (
                        <div key={idx} className="relative group">
                          <div 
                            className="w-7 h-7 rounded-full border border-black/10 dark:border-white/20 cursor-pointer overflow-hidden transition-transform hover:scale-110"
                            style={{ background: color }}
                          >
                            <input 
                              type="color" 
                              value={color} 
                              onChange={(e) => updateColor(idx, e.target.value)}
                              className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer border-none opacity-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeColor(idx)}
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white dark:bg-white text-[var(--color-brand-accent)] text-[8px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {bcolors.length < 5 && (
                        <button
                          type="button"
                          onClick={addColor}
                          className="w-7 h-7 rounded-full border border-dashed border-black/20 dark:border-white/15 flex items-center justify-center text-black/40 dark:text-white/30 text-sm cursor-pointer hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)] transition-colors"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className={labelBase}>Marketing goals *</label>
                  <div className="grid grid-cols-2 gap-1.5" id="goal_grid">
                    {[
                      { id: "awareness", name: "Brand Awareness" },
                      { id: "customers", name: "Get Customers" },
                      { id: "online_sales", name: "Online Sales" },
                      { id: "retention", name: "Retention" },
                      { id: "credibility", name: "Credibility" },
                      { id: "launch", name: "Launch" },
                    ].map(goal => (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className={\`text-left p-2 rounded-sm border transition-all duration-150 cursor-pointer flex items-center gap-2 \${
                          goals.includes(goal.id)
                            ? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)]/10'
                            : 'border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] hover:border-black/20 dark:hover:border-white/20'
                        }\`}
                      >
                        <div className="text-[11px] font-semibold text-black dark:text-white transition-colors">{goal.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 11. Additional Notes */}
                <div className="md:col-span-2">
                  <label htmlFor="biz_extra" className={labelBase}>Additional Notes (Optional)</label>
                  <textarea 
                    id="biz_extra" 
                    placeholder="Upcoming launches, seasonal peaks, past campaigns that worked..." 
                    onChange={handleChange} 
                    value={formData.biz_extra}
                    className={inputBase + " min-h-[60px] resize-y"}
                  />
                </div>
              </div>

              `;

const finalContent = content.substring(0, startIndex) + newFormContent + content.substring(endIndex);
fs.writeFileSync('src/app/details/page.tsx', finalContent);

