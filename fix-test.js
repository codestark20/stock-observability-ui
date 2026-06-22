import fs from 'fs';
let testFile = fs.readFileSync('test-otel.js', 'utf8');
testFile = testFile.replace('"Checkout Service"', '"of_checkout"');
fs.writeFileSync('test-otel.js', testFile);
