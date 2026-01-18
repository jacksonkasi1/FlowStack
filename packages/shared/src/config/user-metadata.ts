/**
 * User Metadata Configuration
 *
 * Centralized configuration for additional user fields captured during signup.
 * This is the single source of truth for:
 * - @repo/auth (backend additionalFields)
 * - apps/web (frontend form fields)
 * - apps/tanstack (frontend form fields)
 *
 * ⚙️ USER-CONFIGURABLE SECTION:
 * - USER_METADATA_FIELDS - Add/edit fields here to customize signup
 *
 * 🔒 CORE FUNCTIONS (DO NOT EDIT):
 * - getAuthUserFields()
 * - getUIUserFields()
 * - getUserMetadataFieldKeys()
 * These are internal helpers used by the system.
 */

// ** import types
export type UserMetadataFieldType = "string" | "number" | "boolean";

export interface UserMetadataField {
    /** Unique key for the field (stored in metadata JSON) */
    key: string;
    /** Display label for the form */
    label: string;
    /** Placeholder text for the input */
    placeholder?: string;
    /** Helper text shown below the input */
    description?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Field data type */
    type?: UserMetadataFieldType;
    /** If true, this field triggers organization creation on signup */
    createsOrganization?: boolean;
    /** Whether to return this field in API responses (default: false for privacy) */
    returned?: boolean;
}

/**
 * ⚙️ USER-CONFIGURABLE: User Metadata Fields
 *
 * Define all additional fields to capture during user signup.
 * These fields are stored in the user.metadata JSON column.
 *
 * To add a new field, add an entry to this array:
 * @example
 * ```typescript
 * {
 *   key: "companySize",
 *   label: "Company Size",
 *   placeholder: "e.g., 1-10 employees",
 *   required: false,
 *   type: "string",
 * }
 * ```
 */
export const USER_METADATA_FIELDS: UserMetadataField[] = [
    // Organization is now created during onboarding, not signup
    // Add any additional metadata fields you want to capture during signup here
];

// Type for the metadata object based on defined fields
export type UserMetadata = {
    [K in (typeof USER_METADATA_FIELDS)[number]["key"]]?: string | number | boolean;
};

/**
 * 🔒 CORE FUNCTION - DO NOT EDIT
 *
 * Get additional fields configuration for Better Auth
 *
 * Returns the format expected by better-auth's user.additionalFields.
 * This function automatically transforms USER_METADATA_FIELDS into the
 * correct format for the auth package.
 *
 * @internal
 * @returns Better Auth additionalFields configuration
 */
export function getAuthUserFields(): Record<
    string,
    {
        type: "string" | "number" | "boolean";
        required: boolean;
        returned: boolean;
        input: boolean;
    }
> {
    const fields: Record<
        string,
        {
            type: "string" | "number" | "boolean";
            required: boolean;
            returned: boolean;
            input: boolean;
        }
    > = {};

    for (const field of USER_METADATA_FIELDS) {
        fields[field.key] = {
            type: field.type ?? "string",
            required: field.required ?? false,
            returned: field.returned ?? false,
            input: true,
        };
    }

    return fields;
}

/**
 * 🔒 CORE FUNCTION - DO NOT EDIT
 *
 * Get additional fields configuration for AuthUIProvider
 *
 * Returns the format expected by @daveyplate/better-auth-ui.
 * This function automatically transforms USER_METADATA_FIELDS into the
 * correct format for the frontend UI library.
 *
 * @internal
 * @returns AuthUIProvider additionalFields configuration
 */
export function getUIUserFields(): Record<
    string,
    {
        label: string;
        placeholder?: string;
        description?: string;
        required?: boolean;
        type: "string";
    }
> {
    const fields: Record<
        string,
        {
            label: string;
            placeholder?: string;
            description?: string;
            required?: boolean;
            type: "string";
        }
    > = {};

    for (const field of USER_METADATA_FIELDS) {
        fields[field.key] = {
            label: field.label,
            placeholder: field.placeholder,
            description: field.description,
            required: field.required ?? false,
            type: "string", // UI library only supports string type
        };
    }

    return fields;
}

/**
 * 🔒 CORE FUNCTION - DO NOT EDIT
 *
 * Get all user metadata field keys
 *
 * @internal
 * @returns Array of all field keys defined in USER_METADATA_FIELDS
 */
export function getUserMetadataFieldKeys(): string[] {
    return USER_METADATA_FIELDS.map((f) => f.key);
}
