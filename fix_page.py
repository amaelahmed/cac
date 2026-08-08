import re

with open('src/app/details/page.tsx', 'r') as f:
    content = f.read()

# Fix goals
goals_replacements = [
    ('Brand Awareness', 'awareness'),
    ('Get More Customers', 'customers'),
    ('Boost Online Sales', 'online_sales'),
    ('Customer Retention', 'retention'),
    ('Build Credibility', 'credibility'),
    ('Launch / Relaunch', 'launch')
]

for name, val in goals_replacements:
    # Look for the exact line
    pattern = r'<div className="gc" tabIndex="0" role="button" >(.*?)<div className="gc-name">' + name + r'</div>(.*?)</div>'
    def rep(m):
        return f'<div className={{goals.includes("{val}") ? "gc on" : "gc"}} tabIndex={{0}} role="button" onClick={{() => toggleGoal("{val}")}}>{m.group(1)}<div className="gc-name">{name}</div>{m.group(2)}</div>'
    content = re.sub(pattern, rep, content)


# Fix colors
# <div className="cswatch"  data-color="#FF4D1C"><input type="color" value="#FF4D1C"  /><div className="cdel" >×</div></div>
content = re.sub(
    r'<div className="cprow" id="color_row">.*?<div className="cadd" tabIndex="0" role="button" >\+</div>',
    r'''<div className="cprow" id="color_row">
            {bcolors.map((color, idx) => (
              <div key={idx} className="cswatch" style={{background: color}}>
                <input type="color" value={color} onChange={(e) => updateColor(idx, e.target.value)} />
                <div className="cdel" onClick={() => removeColor(idx)}>×</div>
              </div>
            ))}
            <div className="cadd" tabIndex={0} role="button" onClick={addColor}>+</div>''',
    content, flags=re.DOTALL
)

# Fix Generate Button
content = content.replace(
    '<button className="cta-big" >Generate My Full Strategy →</button>',
    '<button className="cta-big" onClick={generateStrategy} disabled={isLoading}>{isLoading ? "Generating..." : "Generate My Full Strategy →"}</button>'
)

# Fix loading overlay (wrap the whole intake in a div or handle loading state)
content = content.replace(
    '<div id="intake">',
    '''<div id="intake" style={{ display: isLoading ? 'none' : 'block' }}>'''
)

# Add loading view before the intake div
loading_view = '''
      {isLoading && (
        <div id="loading" className="on" style={{textAlign: 'center', paddingTop: '50px'}}>
          <div className="lorb" style={{width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff4d1c, #ff9900)', margin: '0 auto 20px', animation: 'spin 1s linear infinite'}}></div>
          <div className="ltitle" style={{fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px'}}>Strategist is researching...</div>
          <div className="lsub" style={{color: '#9ca3af', marginBottom: '30px'}}>Building everything personalised to your business</div>
          <div className="lsteps" style={{maxWidth: '400px', margin: '0 auto', textAlign: 'left'}}>
            {[
              "Analysing market & industry",
              "Researching competitors",
              "Identifying pain points",
              "Formulating growth strategies",
              "Brainstorming viral hooks",
              "Writing 30-day calendar",
              "Preparing design studio",
              "Finalizing brand kit",
              "Analyzing market & revenue leaks",
              "Generating ad creatives & offers"
            ].map((text, idx) => (
              <div key={idx} style={{ 
                opacity: loadingStep >= idx + 1 ? 1 : 0.3, 
                color: loadingStep === idx + 1 ? '#ff4d1c' : '#fff',
                marginBottom: '10px',
                transition: 'all 0.3s'
              }}>
                {loadingStep > idx + 1 ? '✓ ' : (loadingStep === idx + 1 ? '▶ ' : '• ')} 
                {text}
              </div>
            ))}
          </div>
        </div>
      )}
'''

content = content.replace(
    '''<div id="intake" style={{ display: isLoading ? 'none' : 'block' }}>''',
    loading_view + '''\n      <div id="intake" style={{ display: isLoading ? 'none' : 'block' }}>'''
)

with open('src/app/details/page.tsx', 'w') as f:
    f.write(content)
