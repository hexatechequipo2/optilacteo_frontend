interface FieldErrorProps {
  message: string;
}

export function FieldError({ message }: FieldErrorProps) {
  return <span className="text-sm text-red-600">{message}</span>;
}
