import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api';
import { CheckCircle, XCircle } from '../../components/icons';
import { InvitationFormSkeleton } from '../../components/ui/skeletons';

export default function AcceptInvitationPage() {
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const d = theme === 'dark';

  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }
    apiService.getInvitationByToken(token)
      .then(data => { setInvitation(data); setLoading(false); })
      .catch(err => {
        setError(err?.response?.data?.message || 'Invalid or expired invitation');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await apiService.acceptInvitation(token, { firstName, lastName, password, phoneNumber });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = `w-full px-4 py-2 rounded-md border ${
    d ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'
  } focus:outline-none focus:ring-2 focus:ring-amber-400`;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${d ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <InvitationFormSkeleton />
      </div>
    );
  }

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${d ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-lg text-center ${d ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-gray-100' : 'text-gray-900'}`}>Account Created!</h2>
          <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            Your account has been set up successfully. You can now log in.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-md font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${d ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`max-w-md w-full mx-4 p-8 rounded-lg text-center ${d ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
          <XCircle className="mx-auto mb-4 text-red-500" size={48} />
          <h2 className={`text-xl font-bold mb-2 ${d ? 'text-gray-100' : 'text-gray-900'}`}>Invalid Invitation</h2>
          <p className={`text-sm mb-6 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 rounded-md font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${d ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`max-w-md w-full p-8 rounded-lg ${d ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="text-center mb-6">
          <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-900'}`}>Accept Invitation</h2>
          <p className={`text-sm mt-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
            {invitation.inviterName && <><strong>{invitation.inviterName}</strong> invited you to join </>}
            {invitation.branchName && <><strong>{invitation.branchName}</strong></>}
            {invitation.roleName && <> as <strong>{invitation.roleName}</strong></>}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-100 text-red-700 text-sm dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>First Name *</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Last Name *</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} required />
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
            <input type="email" value={invitation.email} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number</label>
            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Password *</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required minLength={8} />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${d ? 'text-gray-300' : 'text-gray-700'}`}>Confirm Password *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} required minLength={8} />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-2.5 rounded-md font-semibold ${
              submitting ? 'bg-amber-300 cursor-not-allowed' : 'bg-amber-400 hover:bg-amber-500 text-gray-900'
            }`}
          >
            {submitting ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
