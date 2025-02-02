# react-mic

Record a user's voice and display as an oscillation.  Plug-n-play component for React apps. Audio is saved as [WebM](https://en.wikipedia.org/wiki/WebM) audio file format.  Works via the HTML5 MediaRecorder API ([currently only available in Chrome & Firefox](https://caniuse.com/#search=MediaRecorder)).

**PLEASE NOTE**: The WebM audio format is not supported in Safari browsers (including Safari on iOS).  You need to save an audio recording as a WAV file in order to get full cross-browser and cross-device support.

If you need a version of this React component that supports the WAV audio format so that you can record and play back audio recordings in *any* browser and mobile device (iOS + Android), you can purchase [React-Mic-Plus](https://react-mic-plus.professionalreactapp.com).  React-Mic-Plus also comes with an optional pause feature.

**NEW!!!**  The full React code for [Voice Record Pro](https://voicerecordpro.com) with React-Mic-Plus built in is [now available](https://hackingbeautyllc.clickfunnels.com/sales-pagewlku31vk).  Create your audio recording or voice-activated React app by building on top of an expert codebase and fully responsive interface that runs on any device.  Let your users share audio recordings by just sharing a web link.  Installation support provided.  Contact [Mark](mailto:support@professionalreactapp.com) if you have any questions.

Join the [Slack channel](https://hackingbeauty-slack-invite.herokuapp.com) if you have any questions or problems with React-Mic or React-Mic-Plus.

Also check out my latest course on [building professional React apps](https://trainingprogram.professionalreactapp.com/sales-page48d2u9lq) for an employer, clients, or your own startup!


## Demos

Check out the [demo](https://www.voicerecordpro.com/#/record).

## Installation

`npm install --save react-mic`

## Features

- Record audio from microphone
- Display sound wave as voice is being recorded
- Save audio as BLOB

## Usage

```js

<ReactMic
  record={boolean}         // defaults -> false.  Set to true to begin recording
  pause={boolean}          // defaults -> false.  Available in React-Mic-Plus upgrade only
  className={string}       // provide css class name
  onStop={function}        // callback to execute when audio stops recording
  onData={function}        // callback to execute when chunk of audio data is available
  strokeColor={string}     // sound wave color
  backgroundColor={string} // background color
/>

```

## Example

```js
import { ReactMic } from 'react-mic';

export class Example extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      record: false
    }

  }

  startRecording = () => {
    this.setState({
      record: true
    });
  }

  stopRecording = () => {
    this.setState({
      record: false
    });
  }

  onData(recordedBlob) {
    console.log('chunk of real-time data is: ', recordedBlob);
  }

  onStop(recordedBlob) {
    console.log('recordedBlob is: ', recordedBlob);
  }

  render() {
    return (
      <div>
        <ReactMic
          record={this.state.record}
          className="sound-wave"
          onStop={this.onStop}
          onData={this.onData}
          strokeColor="#000000"
          backgroundColor="#FF4081" />
        <button onTouchTap={this.startRecording} type="button">Start</button>
        <button onTouchTap={this.stopRecording} type="button">Stop</button>
      </div>
    );
  }
}
```
# Having issues with the lambda function?
Try installing babel-preset-stage-1

Include stage-1 in your webpack.config under presets.

e.g.

```js
module.exports = {
    entry: "./scripts/Main.js",
    output: {
        path: __dirname,
        filename: "./static/script.js"
    },
    module: {
        loaders: [{
            test: /\.css$/,
            loader: "style!css"
        }, {
            test: /\.js$/,
            // exclude: /(node_modules)/,
            loader: 'babel-loader',
            query: {
                presets: ['es2015', 'react', 'stage-1']
            }
        }]

    }
};
```

## License

MIT
