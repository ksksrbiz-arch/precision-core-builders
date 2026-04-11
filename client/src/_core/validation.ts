/**
 * Form Validation Utilities — Client-side validation with helpful messages
 */

export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ─── Validators ────────────────────────────────────────────────────────────

export const validators = {
  required: (fieldName: string = "This field"): ValidationRule => ({
    test: value => Boolean(value?.toString().trim()),
    message: `${fieldName} is required.`,
  }),

  email: (): ValidationRule => ({
    test: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value?.toString() || ""),
    message: "Please enter a valid email address.",
  }),

  minLength: (
    min: number,
    fieldName: string = "This field"
  ): ValidationRule => ({
    test: value => (value?.toString() || "").length >= min,
    message: `${fieldName} must be at least ${min} characters.`,
  }),

  maxLength: (
    max: number,
    fieldName: string = "This field"
  ): ValidationRule => ({
    test: value => (value?.toString() || "").length <= max,
    message: `${fieldName} must be at most ${max} characters.`,
  }),

  minNumber: (
    min: number,
    fieldName: string = "This field"
  ): ValidationRule => ({
    test: value => Number(value) >= min,
    message: `${fieldName} must be at least ${min}.`,
  }),

  maxNumber: (
    max: number,
    fieldName: string = "This field"
  ): ValidationRule => ({
    test: value => Number(value) <= max,
    message: `${fieldName} must be at most ${max}.`,
  }),

  phone: (): ValidationRule => ({
    test: value => /^\+?[\d\s\-()]{10,}$/.test(value?.toString() || ""),
    message: "Please enter a valid phone number.",
  }),

  url: (): ValidationRule => ({
    test: value => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },
    message: "Please enter a valid URL.",
  }),

  match: (
    otherValue: any,
    fieldName: string = "This field"
  ): ValidationRule => ({
    test: value => value === otherValue,
    message: `${fieldName} does not match.`,
  }),

  custom: (test: (value: any) => boolean, message: string): ValidationRule => ({
    test,
    message,
  }),

  // Number validation
  number: (): ValidationRule => ({
    test: value => !isNaN(Number(value)) && value !== "",
    message: "Please enter a valid number.",
  }),

  // Positive number
  positiveNumber: (): ValidationRule => ({
    test: value => !isNaN(Number(value)) && Number(value) > 0,
    message: "Please enter a positive number.",
  }),

  // Date validation
  date: (): ValidationRule => ({
    test: value => {
      if (!value) return false;
      const date = new Date(value);
      return date instanceof Date && !isNaN(date.getTime());
    },
    message: "Please enter a valid date.",
  }),

  // Future date
  futureDate: (): ValidationRule => ({
    test: value => {
      if (!value) return false;
      const date = new Date(value);
      return date instanceof Date && date > new Date();
    },
    message: "Please enter a future date.",
  }),

  // Password strength
  passwordStrength: (): ValidationRule => ({
    test: value => {
      // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(
        value?.toString() || ""
      );
    },
    message:
      "Password must be at least 8 characters with uppercase, lowercase, and numbers.",
  }),
};

// ─── Validation Function ──────────────────────────────────────────────────

export function validate(
  value: any,
  rules: ValidationRule[]
): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.test(value)) {
      errors.push(rule.message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ─── Field Validator Hook (for forms) ───────────────────────────────────

export function useFieldValidator() {
  const validateField = (value: any, rules: ValidationRule[]) => {
    return validate(value, rules);
  };

  const validateForm = (
    formData: Record<string, any>,
    fieldRules: Record<string, ValidationRule[]>
  ): Record<string, string[]> => {
    const errors: Record<string, string[]> = {};

    for (const [fieldName, rules] of Object.entries(fieldRules)) {
      const result = validate(formData[fieldName], rules);
      if (!result.isValid) {
        errors[fieldName] = result.errors;
      }
    }

    return errors;
  };

  return { validateField, validateForm };
}

// ─── Display Helper ──────────────────────────────────────────────────────

export function getErrorMessage(error: Error | null | undefined): string {
  if (!error) return "An unknown error occurred";

  // Handle Supabase errors
  if (error.message.includes("user_not_found")) {
    return "No account found with this email. Please sign up first.";
  }
  if (error.message.includes("invalid_grant")) {
    return "This login link has expired. Please request a new one.";
  }
  if (error.message.includes("Email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (error.message.includes("over_email_send_rate_limit")) {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }

  // Network errors
  if (
    error.message.includes("fetch failed") ||
    error.message.includes("Network")
  ) {
    return "Network error. Check your internet connection.";
  }

  // Fallback
  return error.message || "Something went wrong. Please try again.";
}
