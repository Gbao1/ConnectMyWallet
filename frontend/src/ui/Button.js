export default function Button({ children, type = 'button', intent = 'primary', className = '', ...props }) {
  const base = intent === 'secondary' ? 'btn-secondary' : 'btn-primary';
  return (
    <button type={type} className={`${base} ${className}`} {...props}>
      {children}
    </button>
  );
}


