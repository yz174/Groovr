import TrackPlayer, { Event, State } from 'react-native-track-player';

function logPlaybackService(message: string, payload?: unknown) {
  if (payload === undefined) {
    console.log(`[PlaybackService] ${message}`);
    return;
  }
  console.log(`[PlaybackService] ${message}`, payload);
}

async function PlaybackService() {
  logPlaybackService('Playback service registered');

  TrackPlayer.addEventListener(Event.AndroidConnectorConnected, (event) => {
    logPlaybackService('AndroidConnectorConnected', event);
  });

  TrackPlayer.addEventListener(Event.AndroidConnectorDisconnected, (event) => {
    logPlaybackService('AndroidConnectorDisconnected', event);
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    logPlaybackService('RemotePlay received');
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    logPlaybackService('RemotePause received');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlayPause, async () => {
    logPlaybackService('RemotePlayPause received');
    const state = await TrackPlayer.getPlaybackState();
    if (state.state === State.Playing) {
      logPlaybackService('RemotePlayPause -> pause');
      await TrackPlayer.pause();
      return;
    }
    logPlaybackService('RemotePlayPause -> play');
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    logPlaybackService('RemoteNext received');
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      logPlaybackService('RemoteNext state', { queueLength: queue.length, activeIndex });
      if (!queue.length || activeIndex == null) {
        logPlaybackService('RemoteNext ignored (no active queue)');
        return;
      }
      const nextIndex = activeIndex + 1;
      if (nextIndex >= queue.length) {
        logPlaybackService('RemoteNext ignored (already at last track)');
        return;
      }
      await TrackPlayer.skip(nextIndex);
      await TrackPlayer.play();
      logPlaybackService('RemoteNext handled', { nextIndex });
    } catch (error) {
      logPlaybackService('RemoteNext error', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    logPlaybackService('RemotePrevious received');
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      logPlaybackService('RemotePrevious state', { queueLength: queue.length, activeIndex });
      if (!queue.length || activeIndex == null) {
        logPlaybackService('RemotePrevious ignored (no active queue)');
        return;
      }
      const previousIndex = activeIndex - 1;
      if (previousIndex < 0) {
        logPlaybackService('RemotePrevious ignored (already at first track)');
        return;
      }
      await TrackPlayer.skip(previousIndex);
      await TrackPlayer.play();
      logPlaybackService('RemotePrevious handled', { previousIndex });
    } catch (error) {
      logPlaybackService('RemotePrevious error', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSkip, async (event) => {
    logPlaybackService('RemoteSkip received', event);
    try {
      const queue = await TrackPlayer.getQueue();
      if (!queue.length) {
        logPlaybackService('RemoteSkip ignored (empty queue)');
        return;
      }

      const targetIndex = Math.max(0, Math.min(event.index, queue.length - 1));
      await TrackPlayer.skip(targetIndex);
      await TrackPlayer.play();
      logPlaybackService('RemoteSkip handled', { targetIndex });
    } catch (error) {
      logPlaybackService('RemoteSkip error', error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    logPlaybackService('RemoteSeek received', event);
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    logPlaybackService('RemoteStop received');
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    logPlaybackService('PlaybackError event', event);
  });
}

export { PlaybackService };
export default PlaybackService;
