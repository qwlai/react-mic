import AudioContext from './AudioContext';
import { createAudioMeter } from './VolumeMeter';

let analyser;
let audioCtx;
let mediaRecorder;
let chunks = [];
let startTime;
let stream;
let mediaOptions;
let blobObject;
let onStartCallback;
let onStopCallback;
let onSaveCallback;
let onDataCallback;

const constraints = { audio: true, video: false }; // constraints - only audio needed

navigator.getUserMedia = (navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia);

export class MicrophoneRecorder {
  constructor(onStart, onStop, onSave, onData, options) {
    onStartCallback= onStart;
    onStopCallback= onStop;
    onSaveCallback = onSave;
    onDataCallback = onData;
    mediaOptions= options;
  }

  startRecording=() => {

    startTime = Date.now();

    if(mediaRecorder) {

      if(audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      if(mediaRecorder && mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        return;
      }

      if(audioCtx && mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start(10);
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        if(onStartCallback) { onStartCallback() };
      }
    } else {
      if (navigator.mediaDevices) {
        console.log('getUserMedia supported.');

        navigator.mediaDevices.getUserMedia(constraints)
          .then((str) => {
            stream = str;

            if(MediaRecorder.isTypeSupported(mediaOptions.mimeType)) {
              mediaRecorder = new MediaRecorder(str, mediaOptions);
            } else {
              mediaRecorder = new MediaRecorder(str);
            }

            if(onStartCallback) { onStartCallback() };

            mediaRecorder.onstop = this.onStop;
            mediaRecorder.ondataavailable = (event) => {
              chunks.push(event.data);
              if(onDataCallback) {
                onDataCallback(event.data);
              }
            }

            audioCtx = AudioContext.getAudioContext();
            audioCtx.resume().then(() => {
              analyser = AudioContext.getAnalyser();
              const sourceNode = audioCtx.createMediaStreamSource(stream);
              const audioMeter = createAudioMeter(audioCtx);
              sourceNode.connect(audioMeter);
              sourceNode.connect(analyser);
            });

          });

      } else {
        alert('Your browser does not support audio recording');
      }
    }

  }

  stopRecording() {
    if(mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();

      stream.getAudioTracks().forEach((track) => {
        track.stop()
      })
      mediaRecorder = null
      AudioContext.resetAnalyser();
    }
  }

  onStop(evt) {
    const blob = new Blob(chunks, { 'type' : mediaOptions.mimeType });
    chunks = [];

    const blobObject =  {
      blob      : blob,
      startTime : startTime,
      stopTime  : Date.now(),
      options   : mediaOptions,
      blobURL   : window.URL.createObjectURL(blob)
    }

    if(onStopCallback) { onStopCallback(blobObject) };
    if(onSaveCallback) { onSaveCallback(blobObject) };
  }

}
