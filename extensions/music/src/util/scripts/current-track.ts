import { pipe } from "fp-ts/function";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";

import { createQueryString, parseQueryString, runScript, tell } from "../apple-script";
import { STAR_VALUE } from "../costants";
import { ScriptError, Track } from "../models";

export const reveal = tell("Music", "reveal current track");
export const love = tell("Music", "set loved of current track to true");
export const dislike = tell("Music", "set disliked of current track to true");
export const addToLibrary = pipe(
  tell("Music", 'duplicate current track to source "Library"'),
  // added a fallback script
  TE.orElse(() => tell("Music", 'duplicate current track to library playlist "Library"'))
);

export const setCurrentTrackRating: RTE.ReaderTaskEither<number, ScriptError, string> = pipe(
  R.ask<number>(),
  R.map((rating) => tell("Music", `set rating of current track to ${rating * STAR_VALUE}`))
);

export const getCurrentTrackRating = pipe(
  tell("Music", `get rating of current track`),
  TE.map((rating) => parseInt(rating)),
  TE.map((rating) => Math.round(rating / STAR_VALUE))
);

/**
 *
 * Add a track to a playlist
 * @param playlist - The name of the target playlist
 */
export const addToPlaylist = (playlist: string) =>
  tell(
    "Music",
    `
tell application "Music"
	set theName to name of current track
	set theArtist to artist of current track
	set theAlbum to album of the current track
	set existingTracks to get tracks of source "Library" whose name is theName and artist is theArtist and album is theAlbum
	
	if (count of existingTracks) = 0 then
		set theCount to count of tracks of source "Library"
		duplicate current track to source "Library"
		repeat while theCount = (count of tracks of source "Library")
			delay 1
		end repeat
	end if
	
	set theTrack to first track of source "Library" whose name is theName and artist is theArtist and album is theAlbum
	duplicate theTrack to playlist "${playlist}"
end tell
`
  );

export const getCurrentTrack = (): TE.TaskEither<Error, Readonly<Track>> => {
  const querystring = createQueryString({
    id: "trackId",
    name: "trackName",
    artist: "trackArtist",
    album: "trackAlbum",
    duration: "trackDuration",
    rating: "trackRating",
  });

  // prettier-ignore
  return pipe(
    runScript(`
      set output to ""
        tell application "Music"
          set t to (get current track)
          set trackId to id of t
          set trackName to name of t
          set trackArtist to artist of t
          set trackAlbum to album of t
          set trackDuration to duration of t
          set trackRating to rating of t

          set output to ${querystring}
        end tell
      return output
    `),
    TE.map(parseQueryString<Track>())
  );
};
