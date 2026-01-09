import { z } from 'zod';

// Generic validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

// Validation error type
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Server action result type with validation
export interface ServerActionResult<T = any> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  message?: string;
}

/**
 * Validates data against a Zod schema and returns a structured result
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }
    
    const errors: ValidationError[] = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    
    return {
      success: false,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          field: 'root',
          message: 'Validation failed due to an unexpected error',
          code: 'internal_error',
        },
      ],
    };
  }
}

/**
 * Creates a server action wrapper that validates input data
 */
export function createValidatedAction<TInput, TOutput>(
  inputSchema: z.ZodSchema<TInput>,
  action: (validatedInput: TInput) => Promise<ServerActionResult<TOutput>>
) {
  return async (input: unknown): Promise<ServerActionResult<TOutput>> => {
    const validation = validateData(inputSchema, input);
    
    if (!validation.success) {
      return {
        success: false,
        errors: validation.errors,
        message: 'Validation failed',
      };
    }
    
    try {
      return await action(validation.data!);
    } catch (error) {
      console.error('Server action error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred',
        errors: [
          {
            field: 'root',
            message: 'Server error occurred while processing your request',
            code: 'server_error',
          },
        ],
      };
    }
  };
}

/**
 * Validates form data from FormData object
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  formData: FormData
): ValidationResult<T> {
  const data: Record<string, any> = {};
  
  // Convert FormData to plain object
  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (key.includes('[')) {
      // Handle array fields like line_items[0][description]
      const matches = key.match(/^([^[]+)\[(\d+)\]\[([^\]]+)\]$/);
      if (matches && matches.length >= 4) {
        const arrayName = matches[1];
        const index = matches[2];
        const fieldName = matches[3];
        if (arrayName && index && fieldName) {
          if (!data[arrayName]) data[arrayName] = [];
          const indexNum = parseInt(index);
          if (!data[arrayName][indexNum]) data[arrayName][indexNum] = {};
          data[arrayName][indexNum][fieldName] = value;
        }
      } else {
        // Handle simple array fields like categories[]
        const arrayMatch = key.match(/^([^[]+)\[\]$/);
        if (arrayMatch && arrayMatch.length >= 2) {
          const arrayName = arrayMatch[1];
          if (arrayName) {
            if (!data[arrayName]) data[arrayName] = [];
            data[arrayName].push(value);
          }
        }
      }
    } else {
      // Handle regular fields
      data[key] = value;
    }
  }
  
  // Convert string numbers to actual numbers for numeric fields
  const convertedData = convertStringNumbers(data);
  
  return validateData(schema, convertedData);
}

/**
 * Converts string representations of numbers to actual numbers
 */
function convertStringNumbers(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Try to convert to number if it looks like a number
    const num = Number(obj);
    if (!isNaN(num) && obj.trim() !== '') {
      return num;
    }
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertStringNumbers);
  }
  
  if (typeof obj === 'object') {
    const converted: any = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertStringNumbers(value);
    }
    return converted;
  }
  
  return obj;
}

/**
 * Creates a pagination schema with default values
 */
export function createPaginationSchema(defaultLimit = 20, maxLimit = 100) {
  return z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(maxLimit).default(defaultLimit),
  });
}

/**
 * Creates a date range schema with validation
 */
export function createDateRangeSchema() {
  return z.object({
    date_from: z.string().date({ message: 'Please enter a valid start date' }),
    date_to: z.string().date({ message: 'Please enter a valid end date' }),
  }).refine((data) => new Date(data.date_from) <= new Date(data.date_to), {
    message: 'Start date must be before or equal to end date',
    path: ['date_to'],
  });
}

/**
 * Creates a search and filter schema
 */
export function createSearchFilterSchema() {
  return z.object({
    search: z.string().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).default('desc'),
  });
}

/**
 * Sanitizes string input to prevent XSS and other security issues
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validates UUID format
 */
export const uuidSchema = z.string().uuid({ message: 'Please provide a valid ID' });

/**
 * Validates email format with custom message
 */
export const emailSchema = z.string().email({ message: 'Please enter a valid email address' });

/**
 * Validates positive number
 */
export const positiveNumberSchema = z.number().positive({ message: 'Value must be positive' });

/**
 * Validates non-negative number
 */
export const nonNegativeNumberSchema = z.number().nonnegative({ message: 'Value must be non-negative' });

/**
 * Validates date string
 */
export const dateStringSchema = z.string().date({ message: 'Please enter a valid date' });

/**
 * Validates required string with minimum length
 */
export function requiredStringSchema(fieldName: string, minLength = 1, maxLength?: number) {
  let schema = z.string().min(minLength, `${fieldName} is required`);
  if (maxLength) {
    schema = schema.max(maxLength, `${fieldName} must be less than ${maxLength} characters`);
  }
  return schema;
}