// Debug script to test the failing case
const { calculateRelevanceScore } = require('./src/lib/utils/search-optimization.ts');

const item = {
  id: "",
  name: " ",
  email: "a@a.aa",
  category: "office",
  description: ""
};

const query = "!!";
const fields = ['name', 'email', 'category', 'description'];

console.log('Testing item:', item);
console.log('Query:', query);
console.log('Fields:', fields);

const result = calculateRelevanceScore(item, query, fields);
console.log('Result:', result);

// Manual check
const queryLower = query.toLowerCase().trim();
console.log('Query lower:', queryLower);

fields.forEach(field => {
  const fieldValue = String(item[field] || '').toLowerCase();
  console.log(`Field ${field}: "${fieldValue}" includes "${queryLower}": ${fieldValue.includes(queryLower)}`);
});