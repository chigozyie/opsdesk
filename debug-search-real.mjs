// Debug the actual search function
import { performClientSearch, calculateRelevanceScore } from './src/lib/utils/search-optimization.ts';

const items = [{
  id: "",
  name: " ",
  email: "a@a.aa",
  category: "office",
  description: ""
}];

const searchOptions = {
  query: "!!",
  fields: ['name', 'email', 'category', 'description']
};

console.log('Testing performClientSearch...');
console.log('Items:', items);
console.log('Search options:', searchOptions);

const results = performClientSearch(items, searchOptions);
console.log('Results:', results);

// Test calculateRelevanceScore directly
console.log('\nTesting calculateRelevanceScore directly...');
const scoreResult = calculateRelevanceScore(items[0], "!!", ['name', 'email', 'category', 'description']);
console.log('Score result:', scoreResult);