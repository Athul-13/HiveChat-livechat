import Joi from 'joi';

export const signupSchema = Joi.object({
  firstName: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[A-Za-z\s-]+$/)
    .required()
    .messages({
        'string.pattern.base': 'First name must contain only letters',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters',
        'any.required': 'First name is required'
    }),

    lastName: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[A-Za-z\s-]+$/)
    .required()
    .messages({
        'string.pattern.base': 'Last name must contain only letters',
        'string.min': 'Last name must be at least 1 characters',
        'string.max': 'Last name cannot exceed 50 characters',
        'any.required': 'Last name is required'
    }),

    username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^(?![_.-])(?!.*[_.-]{2})[a-zA-Z0-9._-]+(?<![_.-])$/
)
    .required()
    .messages({
        'string.pattern.base': 'Username must be alphanumeric and can contain underscores (_) and dots (.) but cannot start/end with them or have consecutive ones',
        'string.min': 'Username must be at least 3 characters',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
    }),

    phoneNo: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
        'string.pattern.base': 'Invalid phone number',
        'any.required': 'Phone number is required'
    }),

    email: Joi.string()
    .trim()
    .email({ 
        minDomainSegments: 2, 
        tlds: { allow: ['com', 'net', 'org', 'edu', 'gov'] } 
    })
    .required()
    .messages({
        'string.email': 'Invalid email format',
        'string.pattern.base': 'Email contains invalid characters',
        'string.min': 'Email is too short',
        'any.required': 'Email is required'
    }),

    password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.base': 'Password must include 1 uppercase, 1 number, and 1 symbol',
        'any.required': 'Password is required'
    }),

    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords must match',
        'string.empty': 'Confirm Password is required'
    }),

    termsAccepted: Joi.boolean().valid(true).required().messages({
        'any.only': 'You must accept the Terms and Conditions'
    })
    
});