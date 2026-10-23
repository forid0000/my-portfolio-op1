'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Send,
  CheckCircle,
  AlertTriangle,
  User,
  Mail,
  Phone,
  MapPin,
  MessageSquare,
  Briefcase,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { getClientDeviceInfo } from '@/lib/device-info';
import { getVisitInfo } from '@/lib/visit-tracker';
import { CONTACT_DEFAULTS } from '@/lib/content-defaults';

// Plain validation (no form/schema library: this form ships to every visitor, so
// the page stays light). The server re-validates everything in /api/contact.
interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  purpose: string;
  message: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  purpose: 'Project Inquiry',
  message: '',
};

function validate(v: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (v.fullName.trim().length < 2) errors.fullName = 'Full name must be at least 2 characters.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()))
    errors.email = 'Please enter a valid email address.';
  if (!/^\+?[0-9\s\-()]{7,20}$/.test(v.phone.trim()))
    errors.phone = 'Please enter a valid phone number.';
  if (!v.purpose) errors.purpose = 'Please select a purpose.';
  if (v.message.trim().length < 15) errors.message = 'Payload must be at least 15 characters long.';
  return errors;
}

interface ContactFormProps {
  content?: {
    heading: string;
    highlight: string;
    subtext: string;
    email: string;
    phone: string;
    whatsappLink: string;
    phoneLabel: string;
  };
}

export default function ContactForm({ content }: ContactFormProps) {
  const contactData = content || CONTACT_DEFAULTS;
  // The phone / WhatsApp card is optional: it only renders when at least one is configured.
  const hasPhoneCard = Boolean(contactData.phone || contactData.whatsappLink);

  const [status, setStatus] = useState<'IDLE' | 'SENDING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState('');

  // Engagement signals gathered passively across the page visit, snapshotted
  // at submit time (not streamed) and attached to the outgoing email.
  const mountedAtRef = useRef(0);
  const maxScrollDepthRef = useRef(0);

  useEffect(() => {
    mountedAtRef.current = Date.now();
    const computeScrollDepth = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const depth =
        scrollable > 0 ? Math.min(100, Math.round((window.scrollY / scrollable) * 100)) : 100;
      if (depth > maxScrollDepthRef.current) maxScrollDepthRef.current = depth;
    };
    computeScrollDepth();
    window.addEventListener('scroll', computeScrollDepth, { passive: true });
    return () => window.removeEventListener('scroll', computeScrollDepth);
  }, []);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} copied to clipboard!`);
  };

  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const selectedPurpose = values.purpose;

  // Updates one field; once a submit was attempted, errors re-evaluate as the user types.
  const setField = (field: keyof FormValues) => (value: string) => {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (submitted) setErrors(validate(next));
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length === 0) void onSubmit(values);
  };

  const onSubmit = async (data: FormValues) => {
    setStatus('SENDING');

    // Best-effort browser/device fingerprint + engagement snapshot attached
    // as context for the recipient. Never let this block or fail submission.
    let clientInfo;
    try {
      clientInfo = await getClientDeviceInfo();
    } catch {
      clientInfo = undefined;
    }

    let engagement;
    try {
      const visit = getVisitInfo();
      engagement = {
        timeOnPageSeconds: Math.round((Date.now() - mountedAtRef.current) / 1000),
        maxScrollDepthPercent: maxScrollDepthRef.current,
        visitCount: visit.visitCount,
        isReturningVisitor: visit.isReturning,
        firstVisitAt: visit.firstVisitAt ?? undefined,
      };
    } catch {
      engagement = undefined;
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, clientInfo, engagement }),
      });

      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || 'Failed to send message');
      }

      setStatus('SUCCESS');
      setValues(INITIAL_VALUES);
      setErrors({});
      setSubmitted(false);

      // Reset status after a few seconds
      setTimeout(() => setStatus('IDLE'), 6000);
    } catch (error: any) {
      console.error(error);
      setStatus('ERROR');
      setErrorMessage(error.message || 'An unknown error occurred.');
    }
  };

  return (
    <section
      id="contact"
      className="px-4 sm:px-8 lg:px-12 relative pt-12 md:pt-16 pb-0 mb-0 border-t border-border/30"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
          {/* Left Column: Context / Pitch */}
          <div className="lg:col-span-2 space-y-6 animate-fade-in-up">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
                {contactData.heading}
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-500">
                  {contactData.highlight}
                </span>
              </h2>

              <p className="text-muted-foreground text-lg leading-relaxed pt-2">
                {contactData.subtext}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-6 border-t border-border/30">
              <div
                onClick={() => handleCopy(contactData.email, 'Email')}
                className="space-y-2 group cursor-pointer px-2 py-4 -mx-2 -my-4 rounded-xl hover:bg-white/5 transition-colors"
                role="button"
                tabIndex={0}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground flex items-center justify-between">
                  Direct Email
                  <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </h4>
                <p className="text-sm text-muted-foreground terminal:font-mono">
                  {contactData.email}
                </p>
              </div>

              {hasPhoneCard && (
                <div
                  onClick={() =>
                    handleCopy(contactData.phone || contactData.whatsappLink, 'Phone Number')
                  }
                  className="space-y-2 group cursor-pointer px-2 py-4 -mx-2 -my-4 rounded-xl hover:bg-white/5 transition-colors"
                  role="button"
                  tabIndex={0}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                    <Phone className="w-5 h-5 text-blue-500" />
                  </div>
                  <h4 className="font-semibold text-foreground flex items-center justify-between">
                    {contactData.phoneLabel}
                    <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h4>
                  <p className="text-sm text-muted-foreground terminal:font-mono group-hover:text-blue-500 transition-colors">
                    {contactData.whatsappLink || contactData.phone}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Modernized Form */}
          <div className="lg:col-span-3 w-full">
            <div className="relative w-full animate-fade-in-up">
              {status === 'SUCCESS' ? (
                <div className="flex flex-col items-center justify-center py-20 text-center min-h-[400px] animate-fade-in-up">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-6 relative">
                    <div
                      className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"
                      style={{ animationDuration: '3s' }}
                    />
                    <CheckCircle className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold tracking-tight text-foreground mb-4">
                    Transmission Sent
                  </h3>
                  <p className="text-muted-foreground text-lg max-w-md">
                    Your payload has been securely routed. I'll analyze the data and get back to you
                    within 24 hours.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 relative z-10 animate-fade-in-up"
                >
                  <div className="grid md:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label
                        htmlFor="fullName"
                        className="flex items-center gap-2 text-sm font-medium text-foreground/80"
                      >
                        <User className="w-4 h-4 text-primary" />
                        Full Name *
                      </label>
                      <input
                        type="text"
                        id="fullName"
                        value={values.fullName}
                        onChange={(e) => setField('fullName')(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-base text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/30"
                        disabled={status === 'SENDING'}
                      />
                      {errors.fullName && (
                        <p className="text-red-400 text-xs mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label
                        htmlFor="email"
                        className="flex items-center gap-2 text-sm font-medium text-foreground/80"
                      >
                        <Mail className="w-4 h-4 text-primary" />
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={values.email}
                        onChange={(e) => setField('email')(e.target.value)}
                        placeholder="jane.doe@example.com"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-base text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/30"
                        disabled={status === 'SENDING'}
                      />
                      {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label
                        htmlFor="phone"
                        className="flex items-center gap-2 text-sm font-medium text-foreground/80"
                      >
                        <Phone className="w-4 h-4 text-primary" />
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        value={values.phone}
                        onChange={(e) => setField('phone')(e.target.value)}
                        placeholder="+1 555 010 0100"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-base text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/30"
                        disabled={status === 'SENDING'}
                      />
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label
                        htmlFor="location"
                        className="flex items-center gap-2 text-sm font-medium text-foreground/80"
                      >
                        <MapPin className="w-4 h-4 text-primary" />
                        Location / Timezone
                      </label>
                      <input
                        type="text"
                        id="location"
                        value={values.location}
                        onChange={(e) => setField('location')(e.target.value)}
                        placeholder="City, Country"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-base text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/30"
                        disabled={status === 'SENDING'}
                      />
                    </div>
                  </div>

                  {/* Purpose Selection */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                      <Briefcase className="w-4 h-4 text-primary" />
                      Purpose of Contact *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        'Project Inquiry',
                        'Job Opportunity',
                        'Architecture Consultation',
                        'General Chat',
                      ].map((option) => (
                        <label
                          key={option}
                          className={`cursor-pointer flex items-center justify-center text-center px-4 py-3 rounded-xl border text-sm transition-all duration-300 select-none
                              ${
                                selectedPurpose === option
                                  ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                  : 'bg-black/40 border-white/10 text-foreground/70 hover:bg-white/10 hover:text-foreground'
                              }
                            `}
                        >
                          <input
                            type="radio"
                            value={option}
                            className="sr-only"
                            checked={values.purpose === option}
                            onChange={() => setField('purpose')(option)}
                            disabled={status === 'SENDING'}
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                    {errors.purpose && (
                      <p className="text-red-400 text-xs mt-1">{errors.purpose}</p>
                    )}
                  </div>

                  {/* Message Payload */}
                  <div className="space-y-2">
                    <label
                      htmlFor="message"
                      className="flex items-center justify-between text-sm font-medium text-foreground/80"
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Message Payload *
                      </span>
                      <span className="text-xs text-muted-foreground terminal:font-mono">
                        Min 15 chars
                      </span>
                    </label>
                    <textarea
                      id="message"
                      value={values.message}
                      onChange={(e) => setField('message')(e.target.value)}
                      rows={5}
                      placeholder="Describe your requirements, tech stack preferences, and expected timeline..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-base text-foreground focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/30 resize-y min-h-[140px]"
                      disabled={status === 'SENDING'}
                    />
                    {errors.message && (
                      <p className="text-red-400 text-xs mt-1">{errors.message}</p>
                    )}
                  </div>

                  {status === 'ERROR' && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-fade-in-up">
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-red-400">
                        <strong>Connection Error:</strong> {errorMessage}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={status === 'SENDING'}
                      className="relative group px-8 py-4 bg-foreground text-background hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden w-full sm:w-auto"
                    >
                      <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        {status === 'SENDING' ? (
                          <>
                            <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
                            <span>Routing Payload...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-5 h-5" />
                            <span className="tracking-wide">Launch Transmission</span>
                          </>
                        )}
                      </div>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
