import "server-only";

const STRAVA_OAUTH_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_URL = "https://www.strava.com/api/v3";

export type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number }; // ส่งมาเฉพาะตอน exchange code ครั้งแรก ไม่มีตอน refresh
};

export type StravaActivity = {
  id: number;
  athlete: { id: number };
  type: string; // "Run" | "Walk" | ...
  distance: number; // meters
  moving_time: number; // seconds
  start_date: string; // ISO UTC
  start_date_local?: string; // ISO ตาม timezone ของกิจกรรม
};

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Strava token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`);
  return res.json();
}

export async function getActivity(id: number | string, accessToken: string): Promise<StravaActivity> {
  const res = await fetch(`${STRAVA_API_URL}/activities/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Strava getActivity failed: ${res.status}`);
  return res.json();
}

export async function listActivities(
  accessToken: string,
  after: number, // unix seconds
): Promise<StravaActivity[]> {
  const res = await fetch(
    `${STRAVA_API_URL}/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Strava listActivities failed: ${res.status}`);
  return res.json();
}
