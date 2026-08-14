import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Bounds are derived from the server's current date at validation time, not hardcoded,
// so this keeps working correctly in future years without a code change.
export function IsSaneAcademicYear(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSaneAcademicYear',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string' || !/^\d{4}$/.test(value)) return false;
          const year = Number(value);
          const minYear = new Date().getFullYear() - 1;
          const maxYear = new Date().getFullYear() + 5;
          return year >= minYear && year <= maxYear;
        },
        defaultMessage(args: ValidationArguments) {
          const minYear = new Date().getFullYear() - 1;
          const maxYear = new Date().getFullYear() + 5;
          return `${args.property} must be a 4-digit year between ${minYear} and ${maxYear}.`;
        },
      },
    });
  };
}
