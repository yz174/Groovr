import TrackPlayer, { Event } from 'react-native-track-player';

export async function PlaybackService() {
  // Lazy require to avoid module initialization order issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { usePlayerStore } = require('../store/playerStore');

  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteNext, () =>
    usePlayerStore.getState().skipNext()
  );
  TrackPlayer.addEventListener(Event.RemotePrevious, () =>
    usePlayerStore.getState().skipPrevious()
  );
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) =>
    TrackPlayer.seekTo(event.position)
  );
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.pause());
}
