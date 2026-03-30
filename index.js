import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';

import App from './App';

TrackPlayer.registerPlaybackService(() => require('./src/services/PlaybackService').default);
registerRootComponent(App);
