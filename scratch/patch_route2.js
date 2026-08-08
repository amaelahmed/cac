const fs = require('fs');
const path = 'functions/api/[[route]].js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
    'message: err.message',
    'message: err.message, stack: err.stack'
);
fs.writeFileSync(path, content);
