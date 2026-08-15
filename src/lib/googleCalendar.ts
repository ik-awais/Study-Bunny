import type { PlannerItem } from './db'; // 🚀 Added 'type' keyword

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

export const loadGoogleIdentityScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export const requestCalendarAccess = async (userEmail?: string): Promise<string> => {
  await loadGoogleIdentityScript();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      hint: userEmail,
      callback: (response: any) => {
        if (response.error) reject(response.error);
        else resolve(response.access_token);
      },
    });
    client.requestAccessToken();
  });
};

export const fetchCalendars = async (token: string) => {
  const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch calendars');
  const data = await res.json();
  return data.items.map((c: any) => ({ id: c.id, summary: c.summary, primary: c.primary }));
};

const formatGoogleEvent = (item: PlannerItem) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const startDateTime = new Date(`${item.date}T${item.startTime}:00`).toISOString();
  const endDateTime = new Date(`${item.date}T${item.endTime}:00`).toISOString();

  return {
    summary: `🐰 ${item.title}`,
    description: `Subject: ${item.subject}\n\n${item.description || ''}\n\n---\nSynced from Study Bunny`,
    start: { dateTime: startDateTime, timeZone },
    end: { dateTime: endDateTime, timeZone },
  };
};

export const exportEventToGoogle = async (token: string, calendarId: string, item: PlannerItem): Promise<string> => {
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(formatGoogleEvent(item))
  });
  if (!res.ok) throw new Error('Failed to create event');
  const data = await res.json();
  return data.id;
};

export const updateEventInGoogle = async (token: string, calendarId: string, item: PlannerItem) => {
  if (!item.googleEventId) return exportEventToGoogle(token, calendarId, item);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${item.googleEventId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(formatGoogleEvent(item))
  });
  if (!res.ok) {
    if (res.status === 404) return exportEventToGoogle(token, calendarId, item);
    throw new Error('Failed to update event');
  }
  return item.googleEventId;
};

export const deleteEventFromGoogle = async (token: string, calendarId: string, eventId: string) => {
  await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};