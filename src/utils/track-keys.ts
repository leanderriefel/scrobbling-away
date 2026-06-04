export const normalizeKeyPart = (value: string | undefined) =>
  value?.trim().toLocaleLowerCase() ?? "";

export const artistKey = (artistName: string) => normalizeKeyPart(artistName);

export const albumKey = (artistName: string, albumName: string | undefined) =>
  `${artistKey(artistName)}:${normalizeKeyPart(albumName)}`;

export const trackKey = (artistName: string, trackName: string) =>
  `${artistKey(artistName)}:${normalizeKeyPart(trackName)}`;

export const matchesTrack = (
  artistName: string,
  trackName: string,
  targetArtistName: string,
  targetTrackName: string,
) => trackKey(artistName, trackName) === trackKey(targetArtistName, targetTrackName);
