import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Eye, EyeOff, Loader2, Moon, QrCode, ShieldCheck, ShoppingCart, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../components/Toast';

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { isDark, toggle: toggleTheme } = useTheme();
  const [mode, setMode] = useState('login'); // login | signup | otp | forgot | reset
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  // Signed proof that the password step just succeeded, and the only thing the
  // OTP step will accept. Held in memory alone -- it is short-lived and has no
  // business outliving the tab.
  const [challengeToken, setChallengeToken] = useState(null);
  const [debugOtp, setDebugOtp] = useState(null);

  const [form, setForm] = useState({
    name: '', username: '', email: '', phone: '', password: '', confirmPassword: '', otp: '',
  });
  // A reset link arrives as ?token=... -- landing on it opens the reset form.
  const [resetToken, setResetToken] = useState(null);

  const navigate = useNavigate();
  const toast = useToast();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    // Staying signed in is the sane default on a shop's own phone.
    setRememberMe(window.innerWidth < 768);

    const token = new URLSearchParams(window.location.search).get('token');
    if (token) {
      setResetToken(token);
      setMode('reset');
      // Keep the token out of the address bar, history and any Referer header.
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { identifier: form.username });
      // Deliberately the same answer whether or not the account exists.
      toast.success(res.data.message);
      setMode('login');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('The two passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        reset_token: resetToken, new_password: form.password,
      });
      toast.success('Password changed. Sign in with the new one.');
      setResetToken(null);
      setMode('login');
    } catch (err) {
      toast.error(errorMessage(err, 'That reset link is no longer valid'));
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error(t('auth.passwords_dont_match', 'The two passwords do not match'));
      return;
    }
    if (form.password.length < 10) {
      toast.error(t('auth.password_too_short', 'Use at least 10 characters for your password'));
      return;
    }
    if (!form.phone || form.phone.trim().length < 10) {
      toast.error(t('auth.phone_too_short', 'Please enter a valid phone number (at least 10 digits)'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        name: form.name, username: form.username, email: form.email,
        phone: form.phone, password: form.password,
      });
      setChallengeToken(res.data.challenge_token);
      setDebugOtp(res.data.debug_otp || null);
      setMode('otp');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not create the account'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        identifier: form.username,
        password: form.password,
      });
      setChallengeToken(res.data.challenge_token);
      setDebugOtp(res.data.debug_otp || null);
      setMode('otp');
    } catch (err) {
      toast.error(errorMessage(err, 'Could not sign in'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', {
        challenge_token: challengeToken,
        otp: form.otp,
      });
      login(res.data, rememberMe);
      navigate('/app', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, 'That code was not accepted'));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const res = await api.post('/auth/resend-otp', { challenge_token: challengeToken });
      // A resend mints a fresh challenge; the old one is replaced.
      setChallengeToken(res.data.challenge_token);
      setDebugOtp(res.data.debug_otp || null);
      toast.success(t('auth.new_code_sent', 'A new code has been sent'));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const headings = {
    login: [t('auth.welcome_back', 'Welcome back'), t('auth.sign_in_to_store', 'Sign in to your store')],
    signup: [t('auth.create_account_title', 'Create your account'), t('auth.create_account_subtitle', 'Set up your store on Vendor360')],
    otp: [t('auth.verify_title', 'Verify it is you'), t('auth.verify_subtitle', 'Enter the 6-digit code')],
    forgot: [t('auth.forgot_title', 'Reset your password'), t('auth.forgot_subtitle', 'We will send you a reset link')],
    reset: [t('auth.reset_title', 'Choose a new password'), t('auth.reset_subtitle', 'At least 10 characters')],
  };
  const [title, subtitle] = headings[mode];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-0 md:p-6 lg:p-10 selection:bg-brand-primary selection:text-white font-roboto antialiased">
      <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl h-screen md:h-auto md:min-h-[600px] md:rounded-3xl bg-brand-surface border-0 md:border md:border-brand-border/80 shadow-2xl overflow-hidden grid md:grid-cols-12">
        {/* PC Desktop Left Brand Showcase Panel */}
        <div className="hidden md:flex md:col-span-5 lg:col-span-6 bg-brand-primary text-brand-on-primary p-8 lg:p-10 flex-col justify-between relative overflow-hidden">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-sm font-inter font-bold text-xl">
                V
              </div>
              <div>
                <h2 className="text-xl font-bold font-inter leading-tight">Vendor360</h2>
                <p className="text-xs opacity-80">Smart Kirana POS & Digital Khata</p>
              </div>
            </div>

            <h3 className="text-2xl lg:text-3xl font-extrabold font-inter leading-snug mb-3">
              Complete store billing, stock & udhaar on PC and Mobile.
            </h3>
            <p className="text-sm opacity-85 leading-relaxed mb-8">
              Automatically adapts to your desktop counter workstation or mobile phone with offline resilience and vernacular voice entry.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-white/15">
                <ShoppingCart size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Fast Counter Billing & FIFO Batches</p>
                  <p className="text-[11px] opacity-80">Barcode scan, expiry-first stock deduction, and GST purchase register.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-white/15">
                <QrCode size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">UPI Soundbox & Auto-Reconciliation</p>
                  <p className="text-[11px] opacity-80">Dynamic QR with instant voice announcements in Hindi, Marathi, Bengali & English.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white/10 rounded-2xl p-3.5 border border-white/15">
                <BookOpen size={20} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Digital Khata & Offline-First Sync</p>
                  <p className="text-[11px] opacity-80">Track customer credit, send 1-tap WhatsApp reminders, and bill even without internet.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 flex items-center justify-between text-xs opacity-80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} /> PBKDF2-SHA256 & 2FA Protected
            </span>
            <span>v2.0</span>
          </div>
        </div>

        {/* Right Form Column (Full screen on Mobile, Right half on PC) */}
        <div className="md:col-span-7 lg:col-span-6 flex flex-col justify-between h-full">
          <div>
            {/* Header (Compact top bar on PC, Full hero header on Mobile) */}
            <div className="bg-brand-primary md:bg-brand-surface text-brand-on-primary md:text-brand-ink p-5 md:px-8 md:pt-7 md:pb-3 text-center md:text-left relative shrink-0 md:border-b md:border-brand-border/40">
              {(mode === 'otp' || mode === 'forgot' || mode === 'reset') && (
                <button
                  onClick={() => setMode('login')}
                  aria-label={t('auth.go_back', 'Go back')}
                  className="absolute left-4 top-5 md:static md:mb-3 opacity-80 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-brand-primary rounded-full p-1 outline-none inline-flex items-center gap-1 text-xs font-bold"
                >
                  <ArrowLeft size={20} />
                </button>
              )}

              <div className="flex items-center justify-between gap-2 mb-3">
                {/* Language Switcher Pill */}
                <div className="flex justify-center md:justify-start gap-1.5 flex-wrap mx-auto md:mx-0">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        i18n.changeLanguage(l.code);
                        localStorage.setItem('vendor_lang', l.code);
                      }}
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                        i18n.language === l.code
                          ? 'bg-white text-brand-primary md:bg-brand-primary md:text-brand-on-primary shadow-sm'
                          : 'bg-white/20 text-white/90 hover:bg-white/30 md:bg-brand-bg md:text-brand-muted md:hover:text-brand-ink'
                      }`}
                    >
                      {l.code === 'en' ? 'English' : l.code === 'hi' ? 'हिंदी' : l.code === 'mr' ? 'मराठी' : 'বাংলা'}
                    </button>
                  ))}
                </div>

                {/* Theme Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                  className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 md:bg-brand-bg md:hover:bg-brand-border/40 active:scale-95 text-white md:text-brand-ink flex items-center justify-center transition-all outline-none shrink-0"
                >
                  {isDark ? <Sun size={17} className="text-amber-300 md:text-amber-500" /> : <Moon size={17} />}
                </button>
              </div>

              <div className="md:hidden w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-2 border border-white/30 shadow-sm font-inter font-bold text-xl">
                V
              </div>
              <h1 className="text-xl md:text-2xl font-bold font-inter">{title}</h1>
              <p className="opacity-85 md:text-brand-muted text-xs mt-0.5">{subtitle}</p>
            </div>

            <div className="p-6 md:px-8 md:py-6">
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <Field label={t('auth.username_or_email', 'Username or email')}>
                  <input
                    name="username"
                    required
                    value={form.username}
                    onChange={set}
                    autoComplete="username"
                    className={inputClass}
                    placeholder={t('auth.username_placeholder', 'Enter username or email')}
                  />
                </Field>

                <Field
                  label={t('auth.password', 'Password')}
                  action={
                    <button type="button" onClick={() => setMode('forgot')} className="text-xs font-bold text-brand-primary hover:underline">
                      {t('auth.forgot', 'Forgot?')}
                    </button>
                  }
                >
                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={form.password}
                      onChange={set}
                      autoComplete="current-password"
                      className={`${inputClass} pr-10`}
                      placeholder={t('auth.password_placeholder', 'Your password')}
                    />
                    <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                  </div>
                </Field>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="w-4 h-4 rounded border-brand-border text-brand-primary focus:ring-brand-primary" />
                  <span className="text-sm text-brand-ink font-medium">{t('auth.keep_signed_in', 'Keep me signed in on this device')}</span>
                </label>

                <SubmitButton loading={loading}>{t('auth.sign_in', 'Sign in')}</SubmitButton>

                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      username: 'testowner',
                      password: 'Test@123456',
                    }))
                  }
                  className="w-full py-2.5 px-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 hover:bg-brand-primary/10 text-brand-primary text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <span>{t('auth.demo_fill', 'Use Demo Store (testowner)')}</span>
                </button>

                <p className="text-center text-sm text-brand-muted">
                  {t('auth.new_here', 'New here?')}{' '}
                  <button type="button" onClick={() => setMode('signup')} className="font-bold text-brand-primary hover:underline">
                    {t('auth.create_account', 'Create an account')}
                  </button>
                </p>
              </form>
            )}

            {mode === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('auth.your_name', 'Your name')}><input name="name" required value={form.name} onChange={set} className={inputClass} placeholder="Rakesh Sharma" /></Field>
                  <Field label={t('auth.username', 'Username')}><input name="username" required minLength={3} value={form.username} onChange={set} className={inputClass} placeholder="rakesh_store" /></Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('auth.email', 'Email')}><input name="email" type="email" required value={form.email} onChange={set} className={inputClass} placeholder="you@example.com" /></Field>
                  <Field label={t('auth.phone', 'Phone')}><input name="phone" required minLength={10} value={form.phone} onChange={set} className={inputClass} placeholder="+91 98765 43210" /></Field>
                </div>
                <Field label={t('auth.password', 'Password')}>
                  <div className="relative">
                    <input name="password" type={showPassword ? 'text' : 'password'} required minLength={10} value={form.password} onChange={set} autoComplete="new-password" className={`${inputClass} pr-10`} placeholder={t('auth.at_least_10_chars', 'At least 10 characters')} />
                    <PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />
                  </div>
                </Field>
                <Field label={t('auth.confirm_password', 'Confirm password')}>
                  <input name="confirmPassword" type="password" required value={form.confirmPassword} onChange={set} autoComplete="new-password" className={inputClass} />
                </Field>

                <SubmitButton loading={loading}>{t('auth.create_account_button', 'Create account')}</SubmitButton>

                <p className="text-center text-sm text-brand-muted">
                  {t('auth.already_registered', 'Already registered?')}{' '}
                  <button type="button" onClick={() => setMode('login')} className="font-bold text-brand-primary hover:underline">
                    {t('auth.sign_in', 'Sign in')}
                  </button>
                </p>
              </form>
            )}

            {mode === 'otp' && (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border text-center">
                  <p className="text-sm text-brand-ink">
                    {t('auth.code_sent', 'We sent a 6-digit code to your registered phone.')}
                  </p>
                  {debugOtp && (
                    <p className="text-xs text-brand-amber font-bold mt-2">
                      No SMS provider is connected yet — your code is {debugOtp}
                    </p>
                  )}
                </div>

                <Field label={t('auth.verify_title', 'Verification code')}>
                  <input
                    name="otp" inputMode="numeric" pattern="[0-9]*" maxLength={6} required
                    value={form.otp} onChange={set} autoComplete="one-time-code"
                    className="w-full bg-brand-bg border border-brand-border rounded-lg px-4 py-3 text-center tracking-[0.5em] font-bold text-xl text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="------"
                  />
                </Field>

                <button type="submit" disabled={loading || form.otp.length !== 6} className="w-full bg-brand-primary text-brand-on-primary font-bold py-3 rounded-2xl shadow-md hover:bg-brand-primary-dark active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : t('auth.verify_button', 'Verify and continue')}
                </button>

                <button type="button" onClick={resend} className="w-full text-xs font-bold text-brand-primary hover:underline">
                  {t('auth.send_new_code', 'Send a new code')}
                </button>
              </form>
            )}

            {mode === 'forgot' && (
              <form onSubmit={requestReset} className="space-y-4">
                <label className="block">
                  <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                    {t('auth.username_or_email', 'Username or email')}
                  </span>
                  <input
                    required
                    name="username"
                    value={form.username}
                    onChange={set}
                    autoComplete="username"
                    className="w-full mt-1 bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder={t('auth.username_placeholder', 'Enter username or email')}
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading || !form.username.trim()}
                  className="w-full bg-brand-primary text-brand-on-primary font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />} {t('auth.send_reset_link', 'Send the reset link')}
                </button>
                <button type="button" onClick={() => setMode('login')} className="w-full bg-brand-bg border border-brand-border text-brand-ink font-bold py-3 rounded-2xl">
                  {t('auth.back_to_sign_in', 'Back to sign in')}
                </button>
              </form>
            )}

            {mode === 'reset' && (
              <form onSubmit={submitReset} className="space-y-4">
                <label className="block">
                  <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                    {t('auth.new_password', 'New password')}
                  </span>
                  <input
                    required
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={set}
                    autoComplete="new-password"
                    minLength={10}
                    className="w-full mt-1 bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder={t('auth.at_least_10_chars', 'At least 10 characters')}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">
                    {t('auth.confirm_new_password', 'Confirm new password')}
                  </span>
                  <input
                    required
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={set}
                    autoComplete="new-password"
                    className="w-full mt-1 bg-brand-bg border border-brand-border rounded-2xl px-4 py-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </label>
                <p className="text-[11px] text-brand-muted">
                  {t('auth.signs_you_out', 'Changing your password signs you out everywhere else.')}
                </p>
                <button
                  type="submit"
                  disabled={loading || form.password.length < 10}
                  className="w-full bg-brand-primary text-brand-on-primary font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />} {t('auth.set_new_password', 'Set the new password')}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* In-App Legal Footer */}
        <div className="p-3.5 border-t border-brand-border/40 text-center bg-brand-bg/50 shrink-0">
          <p className="text-[11px] text-brand-muted">
            Vendor360 Kirana App •{' '}
            <Link to="/legal" className="text-brand-primary font-semibold hover:underline">
              Terms & Privacy Policy
            </Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary';

function Field({ label, children, action }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] font-bold text-brand-muted uppercase tracking-wider">{label}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function PasswordToggle({ shown, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="absolute right-3 top-3 text-brand-muted hover:text-brand-ink focus-visible:ring-2 focus-visible:ring-brand-primary outline-none rounded"
    >
      {shown ? <EyeOff size={17} /> : <Eye size={17} />}
    </button>
  );
}

function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full mt-2 bg-brand-primary text-brand-on-primary font-bold py-3 rounded-2xl shadow-md hover:bg-brand-primary-dark active:scale-[0.98] transition-all flex justify-center items-center disabled:opacity-60"
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : children}
    </button>
  );
}
