declare module 'react-native-mjpeg' {
  import { Component } from 'react';
    import { ViewProps } from 'react-native';

  export interface MjpegViewProps extends ViewProps {
    source: { uri: string };
    onError?: (error: any) => void;
    style?: any;
    resizeMode?: 'contain' | 'cover' | 'stretch';
  }

  export default class MjpegView extends Component<MjpegViewProps> {}
}
