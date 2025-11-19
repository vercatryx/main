"use client";

import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    preferredContact: "",
    callbackTime: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityProgress, setAvailabilityProgress] = useState(0);
  const [availabilityResult, setAvailabilityResult] = useState<string | null>(null);
  const [availabilityRequestId, setAvailabilityRequestId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitted(true);

      // Reset form after 5 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          name: "",
          email: "",
          company: "",
          phone: "",
          preferredContact: "",
          callbackTime: "",
          message: "",
        });
      }, 5000);
    } catch (err) {
      setError('Failed to send message. Please try again or email us directly at info@vercatryx.com');
      console.error('Error submitting form:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const checkAvailability = async () => {
    // Validate required fields for availability check
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in your name, email, and phone number before checking availability');
      return;
    }

    setCheckingAvailability(true);
    setAvailabilityProgress(0);
    setAvailabilityResult(null);
    setError(null);
    setTimeRemaining(180); // Reset to 3 minutes

    try {
      // Send availability check request
      const response = await fetch('/api/availability/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          company: formData.company,
          phone: formData.phone,
          message: formData.message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send availability check');
      }

      const data = await response.json();
      setAvailabilityRequestId(data.requestId);

      // Start progress bar and timer (3 minutes = 180 seconds)
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });

        setAvailabilityProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + (100 / 180); // Increment for 180 seconds
        });
      }, 1000); // Update every second
    } catch (err) {
      setError('Failed to check availability. Please try again.');
      setCheckingAvailability(false);
      console.error('Error checking availability:', err);
    }
  };

  // Poll for status updates when checking availability
  useEffect(() => {
    if (!availabilityRequestId || !checkingAvailability) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/availability/status/${availabilityRequestId}`);
        const data = await response.json();

        if (data.status === 'available') {
          setCheckingAvailability(false);
          setAvailabilityResult("Good news! Someone is available and will be calling you shortly.");
          setAvailabilityProgress(100);
        } else if (data.status === 'unavailable') {
          setCheckingAvailability(false);
          setAvailabilityResult("No one is available right now, but we'll get back to you within 24 hours.");
          setAvailabilityProgress(100);
        } else if (data.status === 'timeout') {
          setCheckingAvailability(false);
          setAvailabilityResult("Nobody's available at the moment, but we'll get back to you within 24 hours.");
          setAvailabilityProgress(100);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [availabilityRequestId, checkingAvailability]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-foreground">
            Let's discuss how we can automate your repetitive tasks and save you time.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20/20 border border-red-500 rounded-lg p-6 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {submitted || checkingAvailability || availabilityResult ? (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-8 text-center">
            {submitted ? (
              <>
                <h2 className="text-2xl font-bold text-green-400 mb-2">Thank You!</h2>
                <p className="text-foreground">We've received your message and will get back to you soon.</p>
              </>
            ) : availabilityResult ? (
              <>
                <h2 className="text-2xl font-bold text-green-400 mb-4">Thank You!</h2>
                <div className={`p-4 rounded-lg ${availabilityResult.includes("available now") || availabilityResult.includes("Good news")
                    ? "bg-green-900/20 border border-green-700"
                    : "bg-yellow-900/20 border border-yellow-700"
                  }`}>
                  <p className={`text-lg ${availabilityResult.includes("available now") || availabilityResult.includes("Good news")
                      ? "text-green-400"
                      : "text-yellow-400"
                    }`}>
                    {availabilityResult}
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-green-400 mb-4">Checking Availability...</h2>
                <div className="mb-6">
                  <div className="w-full bg-secondary rounded-full h-2.5 max-w-md mx-auto">
                    <div
                      className="bg-brand-blue h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${availabilityProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Let's see if I can find someone... {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-2">
                  Company
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                  placeholder="Your company"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="preferredContact" className="block text-sm font-medium text-foreground mb-2">
                  Preferred Method of Communication *
                </label>
                <select
                  id="preferredContact"
                  name="preferredContact"
                  required
                  value={formData.preferredContact}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                >
                  <option value="">Select a method</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone Call</option>
                  <option value="text">Text Message</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label htmlFor="callbackTime" className="block text-sm font-medium text-foreground mb-2">
                  When are you available for a callback?
                </label>
                <input
                  type="text"
                  id="callbackTime"
                  name="callbackTime"
                  value={formData.callbackTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground"
                  placeholder="e.g., Weekdays 2-5 PM, or anytime"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Give us multiple times and we'll try to make it work
                </p>
              </div>
            </div>



            <div>
              <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                Message
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 bg-card border border-border rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent outline-none transition-all text-foreground resize-none"
                placeholder="Tell us anything else we should know (optional)"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-10 py-4 bg-brand-blue text-foreground rounded-lg hover:bg-brand-blue-hover transition-colors text-xl font-medium disabled:bg-secondary disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-3">Or</h3>
              <button
                type="button"
                onClick={checkAvailability}
                disabled={checkingAvailability}
                className="px-6 py-3 bg-brand-blue text-foreground rounded-lg hover:bg-brand-blue-hover transition-colors font-medium disabled:bg-secondary disabled:cursor-not-allowed"
              >
                See if someone is available to talk now
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
