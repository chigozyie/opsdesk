// Simple test to debug the issue
const item = {
  name: " ",
  email: "a@a.aa", 
  category: "office",
  description: ""
};

const query = "!!";
const fields = ['name', 'email', 'category', 'description'];

// Manual implementation of the logic
function testCalculateRelevanceScore(item, searchQuery, searchFields) {
  if (!searchQuery.trim() || searchQuery.trim().length < 2) {
    return { score: 0, matchedFields: [] };
  }

  const query = searchQuery.toLowerCase().trim();
  
  // First check if the full query matches any field
  const hasFullQueryMatch = searchFields.some(field => {
    const fieldValue = String(item[field] || '').toLowerCase();
    return fieldValue.includes(query);
  });

  console.log('hasFullQueryMatch:', hasFullQueryMatch);
  console.log('query.includes(" "):', query.includes(' '));
  console.log('special chars test:', /[!@#$%^&*(),.?":{}|<>]/.test(query));

  // If no full query match and query contains spaces or special chars, return no match
  if (!hasFullQueryMatch && (query.includes(' ') || /[!@#$%^&*(),.?":{}|<>]/.test(query))) {
    console.log('Returning no match due to special chars');
    return { score: 0, matchedFields: [] };
  }

  console.log('Continuing with scoring...');
  return { score: 1, matchedFields: ['test'] }; // dummy
}

const result = testCalculateRelevanceScore(item, query, fields);
console.log('Result:', result);