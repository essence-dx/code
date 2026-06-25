const defaultBaseUrl = "https://essence-suno.vercel.app";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || defaultBaseUrl);
const createdAt = Date.now();
const email =
  process.env.SMOKE_AUTH_EMAIL || `essence-smoke-${createdAt}@example.com`;
const password =
  process.env.SMOKE_AUTH_PASSWORD || `EssenceSmoke-${createdAt}-pass`;
const name = process.env.SMOKE_AUTH_NAME || "Essence Smoke";
const shouldCreateTempUser =
  !process.env.SMOKE_AUTH_EMAIL && process.env.SMOKE_AUTH_CREATE_TEMP !== "false";
const shouldDeleteUser =
  shouldCreateTempUser && process.env.SMOKE_AUTH_DELETE_TEMP !== "false";
const failures = [];
const results = {
  baseUrl: baseUrl.toString(),
  createdTempUser: shouldCreateTempUser,
  deletedTempUser: false,
};
const cookieJar = new Map();

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString();
}

function cookieHeader() {
  return Array.from(cookieJar.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

function storeCookies(response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : splitSetCookieHeader(response.headers.get("set-cookie"));

  for (const cookie of cookies) {
    const [pair] = cookie.split(";");

    if (!pair) {
      continue;
    }

    const separatorIndex = pair.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    cookieJar.set(pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1));
  }
}

function splitSetCookieHeader(value) {
  if (!value) {
    return [];
  }

  return value.split(/,(?=\s*[^;,]+=)/g).map((cookie) => cookie.trim());
}

async function fetchJson(pathname, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("origin", baseUrl.origin);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const cookies = cookieHeader();

  if (cookies) {
    headers.set("cookie", cookies);
  }

  const response = await fetch(url(pathname), {
    ...init,
    headers,
    redirect: "manual",
  });
  storeCookies(response);
  const text = await response.text();

  try {
    return { response, json: text ? JSON.parse(text) : null };
  } catch {
    failures.push(`${pathname} did not return JSON.`);
    return { response, json: null };
  }
}

async function postJson(pathname, body) {
  return fetchJson(pathname, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function patchJson(pathname, body) {
  return fetchJson(pathname, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

async function deleteJson(pathname, body) {
  return fetchJson(pathname, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  });
}

if (!email || !password) {
  throw new Error("SMOKE_AUTH_EMAIL and SMOKE_AUTH_PASSWORD are required.");
}

const unauthSongs = await fetchJson("/api/library/songs");
results.unauthSongsStatusCode = unauthSongs.response.status;
assert(
  unauthSongs.response.status === 401,
  `Unauthenticated song list should return 401, got ${unauthSongs.response.status}.`,
);

if (shouldCreateTempUser) {
  const signUp = await postJson("/api/auth/sign-up/email", {
    email,
    name,
    password,
  });
  results.signUpStatusCode = signUp.response.status;
  assert(signUp.response.ok, `Sign-up returned ${signUp.response.status}.`);
} else {
  const signIn = await postJson("/api/auth/sign-in/email", {
    email,
    password,
  });
  results.signInStatusCode = signIn.response.status;
  assert(signIn.response.ok, `Sign-in returned ${signIn.response.status}.`);
}

try {
  const session = await fetchJson("/api/auth/get-session");
  results.sessionStatusCode = session.response.status;
  results.sessionEmailMatches = session.json?.user?.email === email;
  assert(session.response.ok, `Session returned ${session.response.status}.`);
  assert(results.sessionEmailMatches, "Session email did not match smoke user.");

  const initialSongs = await fetchJson("/api/library/songs");
  results.initialSongsStatusCode = initialSongs.response.status;
  assert(initialSongs.response.ok, `Authenticated song list returned ${initialSongs.response.status}.`);
  assert(Array.isArray(initialSongs.json?.songs), "Authenticated song list is missing songs array.");

  const songId = `smoke-song-${createdAt}`;
  const song = {
    artist: "Essence Smoke",
    audioStorageKey: null,
    bpm: 120,
    coverImageUrl: null,
    durationMs: 1234,
    id: songId,
    liked: false,
    lyrics: "Temporary smoke lyric.",
    musicalKey: "C",
    source: "import",
    stylePrompt: "small production smoke check",
    tags: ["smoke"],
    title: "Smoke Song",
    visibility: "private",
  };
  const saveSong = await postJson("/api/library/songs", song);
  results.saveSongStatusCode = saveSong.response.status;
  assert(saveSong.response.ok, `Song save returned ${saveSong.response.status}.`);
  assert(saveSong.json?.song?.id === songId, "Saved song id did not match.");

  const updateSong = await patchJson(`/api/library/songs/${songId}`, {
    liked: true,
    title: "Smoke Song Updated",
  });
  results.updateSongStatusCode = updateSong.response.status;
  assert(updateSong.response.ok, `Song update returned ${updateSong.response.status}.`);
  assert(updateSong.json?.song?.liked === true, "Song update did not persist liked state.");

  const playlist = await postJson("/api/library/playlists", {
    description: "Temporary authenticated smoke playlist.",
    name: "Smoke Playlist",
    visibility: "private",
  });
  const playlistId = playlist.json?.playlist?.id;
  results.playlistStatusCode = playlist.response.status;
  assert(playlist.response.ok, `Playlist create returned ${playlist.response.status}.`);
  assert(typeof playlistId === "string", "Playlist id is missing.");

  if (playlistId) {
    const deletePlaylist = await deleteJson(`/api/library/playlists/${playlistId}`);
    results.deletePlaylistStatusCode = deletePlaylist.response.status;
    assert(
      deletePlaylist.response.ok,
      `Playlist delete returned ${deletePlaylist.response.status}.`,
    );
  }

  const deleteSong = await deleteJson(`/api/library/songs/${songId}`);
  results.deleteSongStatusCode = deleteSong.response.status;
  assert(deleteSong.response.ok, `Song delete returned ${deleteSong.response.status}.`);
} finally {
  if (shouldDeleteUser) {
    const deleteUser = await postJson("/api/auth/delete-user", { password });
    results.deleteUserStatusCode = deleteUser.response.status;
    results.deletedTempUser = deleteUser.response.ok;
    assert(deleteUser.response.ok, `Temporary user delete returned ${deleteUser.response.status}.`);
  }
}

const summary = {
  ok: failures.length === 0,
  results,
  failures,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length) {
  process.exit(1);
}
