// /**
//  * Strategy validation utilities
//  */
// import * as fs from "fs";
// import * as path from "path";
// import Ajv from "ajv";
// import addFormats from "ajv-formats";
// import { config } from "./config";

// // Directory paths
// const SCHEMAS_DIR = path.join(__dirname, "../schemas");
// const STRATEGIES_DIR = path.join(__dirname, "../strategies");

// /**
//  * Loads a JSON schema file
//  * @param schemaName - Name of the schema file (without .json extension)
//  * @returns The schema object
//  */
// export function loadSchema(schemaName: string): object {
// 	try {
// 		const schemaPath = path.join(SCHEMAS_DIR, `${schemaName}.schema.json`);

// 		if (!fs.existsSync(schemaPath)) {
// 			console.error(`Schema file not found: ${schemaPath}`);
// 			throw new Error(`Schema file ${schemaName}.schema.json not found`);
// 		}

// 		const schemaContent = fs.readFileSync(schemaPath, "utf8");
// 		return JSON.parse(schemaContent);
// 	} catch (err) {
// 		console.error(`Error loading schema ${schemaName}:`, err);
// 		throw new Error(
// 			`Failed to load schema ${schemaName}: ${
// 				err instanceof Error ? err.message : String(err)
// 			}`
// 		);
// 	}
// }

// /**
//  * Validates a strategy object against the strategy schema
//  * @param strategy - The strategy object to validate
//  * @returns Validation result with errors if any
//  */
// export function validateStrategy(strategy: any): {
// 	valid: boolean;
// 	errors: any[] | null;
// 	formattedErrors?: string;
// } {
// 	// Skip validation if disabled in config
// 	if (!config.validationEnabled) {
// 		return { valid: true, errors: null };
// 	}

// 	try {
// 		// First check for missing required fields
// 		const requiredFieldsCheck = checkRequiredFields(strategy);
// 		if (!requiredFieldsCheck.valid) {
// 			const errorMessage = `Missing required fields: ${requiredFieldsCheck.missingFields.join(
// 				", "
// 			)}`;
// 			return {
// 				valid: false,
// 				errors: [{ message: errorMessage }],
// 				formattedErrors: errorMessage,
// 			};
// 		}

// 		// Load the strategy schema
// 		const schema = loadSchema("strategy");

// 		// Create Ajv instance
// 		const ajv = new Ajv({ allErrors: true });
// 		addFormats(ajv);

// 		// Compile schema
// 		const validate = ajv.compile(schema);

// 		// Validate strategy
// 		const valid = validate(strategy);

// 		// Format errors if any
// 		if (!valid && validate.errors) {
// 			return {
// 				valid: false,
// 				errors: validate.errors,
// 				formattedErrors: formatValidationErrors(validate.errors),
// 			};
// 		}

// 		return { valid: true, errors: null };
// 	} catch (err) {
// 		console.error("Error validating strategy:", err);
// 		return {
// 			valid: false,
// 			errors: [
// 				{
// 					message: `Failed to validate strategy: ${
// 						err instanceof Error ? err.message : String(err)
// 					}`,
// 				},
// 			],
// 			formattedErrors: `Failed to validate strategy: ${
// 				err instanceof Error ? err.message : String(err)
// 			}`,
// 		};
// 	}
// }

// /**
//  * Validates a strategy JSON file
//  * @param filePath - Path to the strategy JSON file
//  * @returns Validation result with errors if any
//  */
// export function validateStrategyFile(filePath: string): {
// 	valid: boolean;
// 	errors: any[] | null;
// 	formattedErrors?: string;
// } {
// 	try {
// 		// Read and parse the strategy file
// 		const content = fs.readFileSync(filePath, "utf8");
// 		const strategy = JSON.parse(content);

// 		// Validate the strategy
// 		return validateStrategy(strategy);
// 	} catch (err) {
// 		console.error(`Error reading/parsing strategy file ${filePath}:`, err);
// 		return {
// 			valid: false,
// 			errors: [
// 				{
// 					message: `Failed to read/parse strategy file: ${
// 						err instanceof Error ? err.message : String(err)
// 					}`,
// 				},
// 			],
// 			formattedErrors: `Failed to read/parse strategy file: ${
// 				err instanceof Error ? err.message : String(err)
// 			}`,
// 		};
// 	}
// }

// /**
//  * Validates all strategy files in the strategies directory
//  * @returns Map of file paths to validation results
//  */
// export function validateAllStrategyFiles(): Map<
// 	string,
// 	{
// 		valid: boolean;
// 		errors: any[] | null;
// 		formattedErrors?: string;
// 	}
// > {
// 	const results = new Map();

// 	try {
// 		// Ensure strategies directory exists
// 		if (!fs.existsSync(STRATEGIES_DIR)) {
// 			console.error(`Strategies directory ${STRATEGIES_DIR} does not exist`);
// 			const errorResult = {
// 				valid: false,
// 				errors: [
// 					{ message: `Strategies directory ${STRATEGIES_DIR} does not exist` },
// 				],
// 				formattedErrors: `Strategies directory ${STRATEGIES_DIR} does not exist`,
// 			};
// 			results.set("directory_error", errorResult);
// 			return results;
// 		}

// 		// Read all JSON files in the strategies directory
// 		const files = fs.readdirSync(STRATEGIES_DIR);
// 		const jsonFiles = files.filter(
// 			(f) => f.endsWith(".json") && f !== "strategy.schema.json"
// 		);

// 		if (jsonFiles.length === 0) {
// 			console.warn("No strategy files found to validate");
// 			const warningResult = {
// 				valid: false,
// 				errors: [{ message: "No strategy files found to validate" }],
// 				formattedErrors: "No strategy files found to validate",
// 			};
// 			results.set("no_files", warningResult);
// 			return results;
// 		}

// 		// Validate each file
// 		for (const file of jsonFiles) {
// 			const filePath = path.join(STRATEGIES_DIR, file);
// 			results.set(file, validateStrategyFile(filePath));
// 		}

// 		return results;
// 	} catch (err) {
// 		console.error("Error validating strategy files:", err);
// 		const errorResult = {
// 			valid: false,
// 			errors: [
// 				{
// 					message: `Error validating strategy files: ${
// 						err instanceof Error ? err.message : String(err)
// 					}`,
// 				},
// 			],
// 			formattedErrors: `Error validating strategy files: ${
// 				err instanceof Error ? err.message : String(err)
// 			}`,
// 		};
// 		results.set("validation_error", errorResult);
// 		return results;
// 	}
// }

// /**
//  * Checks if a strategy has all required fields
//  * @param strategy - The strategy object to check
//  * @returns Object with validation result and error details
//  */
// export function checkRequiredFields(strategy: any): {
// 	valid: boolean;
// 	missingFields: string[];
// } {
// 	const requiredFields = [
// 		"id",
// 		"name",
// 		"description",
// 		"symbol",
// 		"timeframe",
// 		"enabled",
// 		"indicators",
// 		"models",
// 		"signals",
// 		"risk",
// 	];

// 	const missingFields = requiredFields.filter(
// 		(field) =>
// 			!strategy[field] ||
// 			(Array.isArray(strategy[field]) && strategy[field].length === 0)
// 	);

// 	return {
// 		valid: missingFields.length === 0,
// 		missingFields,
// 	};
// }

// /**
//  * Formats error messages from validation results in a user-friendly way
//  * @param errors - Error array from AJV validation
//  * @returns Formatted error string
//  */
// export function formatValidationErrors(errors: any[] | null): string {
// 	if (!errors || errors.length === 0) {
// 		return "Unknown validation error";
// 	}

// 	// Group errors by path for better readability
// 	const errorsByPath: Record<string, string[]> = {};

// 	errors.forEach((err) => {
// 		const path = err.instancePath || "(root)";
// 		if (!errorsByPath[path]) {
// 			errorsByPath[path] = [];
// 		}
// 		errorsByPath[path].push(
// 			`${err.message} ${err.params ? JSON.stringify(err.params) : ""}`
// 		);
// 	});

// 	// Format grouped errors
// 	return Object.entries(errorsByPath)
// 		.map(([path, messages]) => `${path}:\n  - ${messages.join("\n  - ")}`)
// 		.join("\n\n");
// }
