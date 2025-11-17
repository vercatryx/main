"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

export default function AdminAvailabilityPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const response = searchParams.get('response');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function updateStatus() {
      if (response && (response === 'available' || response === 'unavailable')) {
        try {
          const res = await fetch(`/api/availability/respond/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: response }),
          });

          if (res.ok) {
            setStatus('success');
            setMessage(response === 'available'
              ? 'Great! The customer has been notified that you\'re available and will be calling them shortly.'
              : 'Thanks for responding. The customer has been notified that no one is available right now.'
            );
          } else {
            setStatus('error');
            setMessage('Failed to update status. Please try again.');
          }
        } catch (error) {
          setStatus('error');
          setMessage('An error occurred. Please try again.');
        }
      } else {
        setStatus('error');
        setMessage('Invalid response parameter.');
      }
    }

    updateStatus();
  }, [id, response]);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className={`p-8 rounded-lg border ${
          status === 'success'
            ? 'bg-green-900/20 border-green-700'
            : status === 'error'
            ? 'bg-red-900/20 border-red-700'
            : 'bg-gray-900 border-gray-700'
        }`}>
          <h1 className="text-3xl font-bold mb-4">
            {status === 'loading' && 'Updating Status...'}
            {status === 'success' && '✅ Success!'}
            {status === 'error' && '❌ Error'}
          </h1>
          <p className="text-lg text-gray-300">{message}</p>
        </div>
      </div>
    </main>
  );
}
