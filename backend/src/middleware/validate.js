/**
 * Validation Middleware using Zod Schema
 * Validates request data against Zod schemas and returns detailed errors on mismatch.
 * 
 * @param {object} schema Zod Schema definition
 * @param {string} source Part of req to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errorDetails = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errorDetails,
    });
  }

  // Replace req with parsed/sanitized value
  req[source] = result.data;
  next();
};

export default validate;
