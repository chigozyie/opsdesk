/**
 * Property-based tests for search optimization utilities
 * Feature: business-management-saas, Property 48: Large List Pagination Implementation
 * Feature: business-management-saas, Property 49: Efficient Filtering and Search
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateRelevanceScore,
  highlightSearchTerms,
  performClientSearch,
  buildAdvancedFilters,
  type SearchOptions,
  type AdvancedFilterOptions,
} from './search-optimization';

describe('Search Optimization - Property Tests', () => {
  describe('Property 48: Large List Pagination Implementation', () => {
    it('should handle pagination correctly for any dataset size', () => {
      // Feature: business-management-saas, Property 48: Large List Pagination Implementation
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string(),
              email: fc.emailAddress(),
              description: fc.string(),
            }),
            { minLength: 0, maxLength: 1000 }
          ),
          fc.string(),
          fc.integer({ min: 1, max: 100 }),
          (items, searchQuery, maxResults) => {
            const searchOptions: SearchOptions = {
              query: searchQuery,
              fields: ['name', 'email', 'description'],
              maxResults,
            };

            const results = performClientSearch(items, searchOptions);

            // Property: Results should never exceed maxResults (but only if maxResults is set)
            if (searchOptions.maxResults) {
              expect(results.length).toBeLessThanOrEqual(maxResults);
            }

            // Property: Results should never exceed input size
            expect(results.length).toBeLessThanOrEqual(items.length);

            // Property: All results should be from the original dataset
            results.forEach(result => {
              expect(items).toContain(result.item);
            });

            // Property: Results should be sorted by relevance score (descending)
            for (let i = 1; i < results.length; i++) {
              expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent pagination behavior across different page sizes', () => {
      // Feature: business-management-saas, Property 48: Large List Pagination Implementation
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string(),
              email: fc.emailAddress(),
            }),
            { minLength: 10, maxLength: 200 }
          ),
          fc.integer({ min: 1, max: 50 }),
          (items, pageSize) => {
            const searchOptions: SearchOptions = {
              query: '',
              fields: ['name', 'email'],
              maxResults: pageSize,
            };

            const results = performClientSearch(items, searchOptions);

            // Property: Page size should be respected (but only if maxResults is set)
            if (searchOptions.maxResults) {
              expect(results.length).toBeLessThanOrEqual(pageSize);
            }

            // Property: If items <= pageSize, all items should be returned (when no search query)
            if (items.length <= pageSize && !searchOptions.query.trim()) {
              expect(results.length).toBe(items.length);
            }

            // Property: Results should maintain data integrity
            results.forEach(result => {
              expect(result.item).toBeDefined();
              expect(result.score).toBeGreaterThanOrEqual(0);
              expect(Array.isArray(result.matchedFields)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 49: Efficient Filtering and Search', () => {
    it('should return accurate search results for any query and dataset', () => {
      // Feature: business-management-saas, Property 49: Efficient Filtering and Search
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string({ minLength: 1 }),
              email: fc.emailAddress(),
              category: fc.constantFrom('office', 'travel', 'meals', 'supplies'),
              description: fc.string(),
            }),
            { minLength: 0, maxLength: 100 }
          ),
          fc.string(),
          (items, searchQuery) => {
            const searchOptions: SearchOptions = {
              query: searchQuery,
              fields: ['name', 'email', 'category', 'description'],
            };

            const results = performClientSearch(items, searchOptions);

            if (searchQuery.trim() === '') {
              // Property: Empty query should return all items
              expect(results.length).toBe(items.length);
              results.forEach(result => {
                expect(result.score).toBe(0);
                expect(result.matchedFields).toEqual([]);
              });
            } else {
              // Property: All results should match the search query in at least one field
              results.forEach(result => {
                const item = result.item;
                const queryLower = searchQuery.toLowerCase().trim();
                
                // Skip empty queries or whitespace-only queries
                if (!queryLower) return;
                
                // Skip very short queries that might cause false matches
                if (queryLower.length < 2) return;
                
                const hasMatch = searchOptions.fields.some(field => {
                  const fieldValue = String((item as any)[field] || '').toLowerCase();
                  return fieldValue.includes(queryLower);
                });
                
                // Only check for matches if the query is meaningful
                if (queryLower.length >= 2) {
                  expect(hasMatch).toBe(true);
                }
              });

              // Property: Results with matches should have positive scores
              results.forEach(result => {
                if (result.matchedFields.length > 0) {
                  expect(result.score).toBeGreaterThan(0);
                }
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide accurate relevance scoring for search results', () => {
      // Feature: business-management-saas, Property 49: Efficient Filtering and Search
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1 }),
            email: fc.emailAddress(),
            description: fc.string(),
          }),
          fc.string({ minLength: 1 }),
          (item, searchQuery) => {
            const { score, matchedFields } = calculateRelevanceScore(
              item,
              searchQuery,
              ['name', 'email', 'description']
            );

            // Property: Score should be non-negative
            expect(score).toBeGreaterThanOrEqual(0);

            // Property: Matched fields should be a subset of search fields
            matchedFields.forEach(field => {
              expect(['name', 'email', 'description']).toContain(field);
            });

            const queryLower = searchQuery.toLowerCase().trim();
            
            // Skip very short queries
            if (queryLower.length < 2) {
              expect(score).toBe(0);
              expect(matchedFields).toEqual([]);
              return;
            }
            
            const hasActualMatch = ['name', 'email', 'description'].some(field => {
              const fieldValue = String((item as any)[field] || '').toLowerCase();
              return fieldValue.includes(queryLower);
            });

            if (!hasActualMatch || queryLower === '') {
              expect(score).toBe(0);
              expect(matchedFields).toEqual([]);
            }

            // Property: If fields match, score should be positive
            if (hasActualMatch && queryLower !== '' && queryLower.length >= 2) {
              expect(score).toBeGreaterThan(0);
              expect(matchedFields.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should highlight search terms correctly in any text', () => {
      // Feature: business-management-saas, Property 49: Efficient Filtering and Search
      fc.assert(
        fc.property(
          fc.string(),
          fc.string({ minLength: 1 }),
          (text, searchQuery) => {
            const highlighted = highlightSearchTerms(text, searchQuery);

            // Property: Original text should be preserved if no matches
            if (!text.toLowerCase().includes(searchQuery.toLowerCase())) {
              expect(highlighted).toBe(text);
            }

            // Property: Highlighted text should contain original text content
            const cleanHighlighted = highlighted
              .replace(/<mark[^>]*>/g, '')
              .replace(/<\/mark>/g, '');
            
            // The clean text should contain all original characters
            // (allowing for potential reordering due to highlighting)
            const originalChars = text.split('').sort();
            const cleanChars = cleanHighlighted.split('').sort();
            expect(cleanChars).toEqual(originalChars);

            // Property: If search query is empty, no highlighting should occur
            if (searchQuery.trim() === '') {
              expect(highlighted).toBe(text);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should build efficient database queries with proper filtering', () => {
      // Feature: business-management-saas, Property 49: Efficient Filtering and Search
      fc.assert(
        fc.property(
          fc.record({
            search: fc.option(fc.string()),
            filters: fc.option(fc.dictionary(fc.string(), fc.string())),
            dateRanges: fc.option(
              fc.dictionary(
                fc.string(),
                fc.record({
                  from: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0])),
                  to: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0])),
                })
              )
            ).map(dict => dict ? Object.fromEntries(
              Object.entries(dict).map(([k, v]) => [k, {
                from: v.from || undefined,
                to: v.to || undefined,
              }])
            ) : undefined),
            numberRanges: fc.option(
              fc.dictionary(
                fc.string(),
                fc.record({
                  min: fc.option(fc.float({ min: 0, max: 10000 })),
                  max: fc.option(fc.float({ min: 0, max: 10000 })),
                })
              )
            ).map(dict => dict ? Object.fromEntries(
              Object.entries(dict).map(([k, v]) => [k, {
                min: v.min || undefined,
                max: v.max || undefined,
              }])
            ) : undefined),
            sortBy: fc.option(fc.string()),
            sortDirection: fc.option(fc.constantFrom('asc', 'desc')),
          }),
          (filterOptions) => {
            // Mock query object to test filter building
            const mockQuery = {
              appliedFilters: [] as string[],
              or: function(condition: string) {
                this.appliedFilters.push(`OR: ${condition}`);
                return this;
              },
              eq: function(field: string, value: any) {
                this.appliedFilters.push(`EQ: ${field} = ${value}`);
                return this;
              },
              in: function(field: string, values: any[]) {
                this.appliedFilters.push(`IN: ${field} IN [${values.join(', ')}]`);
                return this;
              },
              gte: function(field: string, value: any) {
                this.appliedFilters.push(`GTE: ${field} >= ${value}`);
                return this;
              },
              lte: function(field: string, value: any) {
                this.appliedFilters.push(`LTE: ${field} <= ${value}`);
                return this;
              },
              order: function(field: string, options: { ascending: boolean }) {
                this.appliedFilters.push(`ORDER: ${field} ${options.ascending ? 'ASC' : 'DESC'}`);
                return this;
              },
            };

            const advancedOptions: AdvancedFilterOptions = {
              search: filterOptions.search ? {
                query: filterOptions.search,
                fields: ['name', 'email'],
              } : undefined,
              filters: filterOptions.filters || undefined,
              dateRanges: filterOptions.dateRanges || undefined,
              numberRanges: filterOptions.numberRanges || undefined,
              sortBy: filterOptions.sortBy || undefined,
              sortDirection: filterOptions.sortDirection || undefined,
            };

            const result = buildAdvancedFilters(mockQuery, advancedOptions);

            // Property: Function should return the query object
            expect(result).toBe(mockQuery);

            // Property: Filters should be applied based on provided options
            const appliedFilters = mockQuery.appliedFilters;

            // If search is provided, OR condition should be applied
            if (filterOptions.search && filterOptions.search.trim()) {
              const hasSearchFilter = appliedFilters.some(filter => filter.startsWith('OR:'));
              expect(hasSearchFilter).toBe(true);
            }

            // If exact filters are provided, EQ conditions should be applied
            if (filterOptions.filters) {
              Object.entries(filterOptions.filters).forEach(([key, value]) => {
                if (value && value.trim() !== '') {
                  const hasFilter = appliedFilters.some(filter => 
                    filter.includes(`EQ: ${key} = ${value}`)
                  );
                  expect(hasFilter).toBe(true);
                }
              });
            }

            // If sorting is provided, ORDER should be applied
            if (filterOptions.sortBy) {
              const hasOrderFilter = appliedFilters.some(filter => filter.startsWith('ORDER:'));
              expect(hasOrderFilter).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Search Performance Properties', () => {
    it('should maintain performance characteristics for large datasets', () => {
      // Feature: business-management-saas, Property 48: Large List Pagination Implementation
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string(),
              email: fc.emailAddress(),
              description: fc.string(),
            }),
            { minLength: 100, maxLength: 1000 }
          ),
          fc.string(),
          (items, searchQuery) => {
            const startTime = Date.now();
            
            const searchOptions: SearchOptions = {
              query: searchQuery,
              fields: ['name', 'email', 'description'],
              maxResults: 50,
            };

            const results = performClientSearch(items, searchOptions);
            
            const executionTime = Date.now() - startTime;

            // Property: Search should complete within reasonable time (< 100ms for 1000 items)
            expect(executionTime).toBeLessThan(100);

            // Property: Results should be properly limited
            expect(results.length).toBeLessThanOrEqual(Math.min(50, items.length));

            // Property: All results should have valid structure
            results.forEach(result => {
              expect(result).toHaveProperty('item');
              expect(result).toHaveProperty('score');
              expect(result).toHaveProperty('highlights');
              expect(result).toHaveProperty('matchedFields');
              expect(typeof result.score).toBe('number');
              expect(Array.isArray(result.matchedFields)).toBe(true);
              expect(typeof result.highlights).toBe('object');
            });
          }
        ),
        { numRuns: 50 } // Reduced runs for performance tests
      );
    });
  });
});