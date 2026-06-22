import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from './Input';
import Button from './Button';
import { useAuth } from '../store/AuthContext';

export default function RegisterForm({ setMode }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [skills, setSkills] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (role === 'provider') {
      setSkills('');
      setErrors((prev) => {
        if (!prev.skills) return prev;
        const { skills: _skills, ...rest } = prev;
        return rest;
      });
    }
  }, [role]);

  const validate = () => {
    const next = {};
    if (!firstName || firstName.trim().length < 1) next.firstName = 'Enter your first name';
    if (!lastName || lastName.trim().length < 1) next.lastName = 'Enter your last name';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Enter a valid email';
    if (!password || password.length < 6) next.password = 'Password must be at least 6 characters';
    if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match';
    if (role === 'user' && !skills.trim()) next.skills = 'List at least one skill';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        preferredName: preferredName.trim(),
        email: email.trim(),
        password,
        role,
        skills: role === 'user' ? skills.trim() : undefined,
      });
      setSuccessMessage('Account created. Please check your email and click the verification link before logging in.');
      setMode('login');
      navigate('/auth?mode=login');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to register';
      setServerError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {serverError ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverError}
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
      <section className="space-y-2">
        <div className="flex bg-white rounded-xl p-1 shadow-sm" role="group" aria-label="Select role">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              role === 'user'
                ? 'bg-purple-100 text-purple-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {role === 'user' && <span className="text-purple-600">✓</span>}
            Professional
          </button>
          <button
            type="button"
            onClick={() => setRole('provider')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              role === 'provider'
                ? 'bg-purple-100 text-purple-800 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {role === 'provider' && <span className="text-purple-600">✓</span>}
            Job provider
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Professionals complete work and need to list their skills. Job providers post work for others to complete.
        </p>
      </section>
      <div className="w-full space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            name="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            error={errors.firstName}
            required
            autoComplete="given-name"
          />
          <Input
            name="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            error={errors.lastName}
            required
            autoComplete="family-name"
          />
        </div>
        <Input
          name="preferredName"
          type="text"
          value={preferredName}
          onChange={(e) => setPreferredName(e.target.value)}
          placeholder="Preferred name (optional)"
          error={errors.preferredName}
          autoComplete="nickname"
        />
        <Input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          error={errors.email}
          required
          autoComplete="email"
        />
        <Input
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          error={errors.password}
          required
          autoComplete="new-password"
        />
        <Input
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
        />
        {role === 'user' ? (
          <div>
            <Input
              name="skills"
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Skills (comma separated)"
              error={errors.skills}
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-gray-500">Example: Cleaning, Plumbing, Electrical</p>
          </div>
        ) : null}
      </div>
      <div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Creating account…' : 'Register'}</Button>

        <div className="text-center mt-3">
          <span className="text-sm text-gray-600">Already registered? </span>
          <button
            type="button" 
            className="text-sm text-primary underline"
            onClick={() => setMode('login')}
          >
            Login
          </button>
        </div>
      </div>
    </form>
  );
}
