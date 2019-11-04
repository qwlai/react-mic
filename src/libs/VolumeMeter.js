/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*

Usage:
audioNode = createAudioMeter(audioContext,clipLevel,averaging,clipLag);

audioContext: the AudioContext you're using.
clipLevel: the level (0 to 1) that you would consider "clipping".
   Defaults to 0.98.
averaging: how "smoothed" you would like the meter to be over time.
   Should be between 0 and less than 1.  Defaults to 0.95.
clipLag: how long you would like the "clipping" indicator to show
   after clipping has occured, in milliseconds.  Defaults to 750ms.

Access the clipping through node.checkClipping(); use node.shutdown to get rid of it.
*/
import config from 'config';

let toWav = require('audiobuffer-to-wav');
const SOUND_SIMILARITY_MODE = 1;
const DISTANCE_VERIFICATION_MODE = 2;

module.exports = {
    createAudioMeter: function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
        let processor = audioContext.createScriptProcessor(2048);
        let notableSignalArr = new Float32Array();
        let distanceSignalArr = new Float32Array();
        let isRecording = false;

        processor.onaudioprocess = volumeAudioProcess;
        processor.clipping = false;
        processor.lastClip = 0;
        processor.volume = 0;
        processor.clipLevel = clipLevel || 0.98;
        processor.averaging = averaging || 0.95;
        processor.clipLag = clipLag || 750;
        processor.notableSignalArr = notableSignalArr;
        processor.isRecording = isRecording;
        processor.isVerifyLocation = false;
        processor.isFirst = true;

        // this will have no effect, since we don't copy the input to the output,
        // but works around a current Chrome bug.
        processor.connect(audioContext.destination);

        processor.checkClipping = function () {
            if (!this.clipping) return false;
            if (this.lastClip + this.clipLag < window.performance.now()) this.clipping = false;
            return this.clipping;
        };

        processor.shutdown = function () {
            let src = audioContext.createBufferSource();

            let audioBuf = audioContext.createBuffer(1, this.notableSignalArr.length, audioContext.sampleRate);
            audioBuf.getChannelData(0).set(this.notableSignalArr);
            src.buffer = audioBuf;
            let wav = toWav(audioBuf);

            let blob = new window.Blob([new DataView(wav)], {
                type: 'audio/wav'
            });

            // full 3s recorded, process signal
            if (processor.isFirst == true) {
                processor.isFirst = false;
                upload(blob, SOUND_SIMILARITY_MODE, 'laptop.wav').then(function (response) {
                    console.log(response);
                    if (response.frequency != null) { //obtained frequency
                        processor.notableSignalArr = distanceSignalArr;
                        processor.isVerifyLocation = true;

                        // play the designated frequency
                        let arr = response.frequency
                        playSound(arr, audioContext);
                    } else { //no frequency, similarity score < threshold
                        processor.disconnect();
                        processor.onaudioprocess = null;
                    }
                }).catch(function (error) {
                    console.log('Something went wrong', error);
                    processor.disconnect();
                    processor.onaudioprocess = null;
                });
            }

            if (processor.isFirst == false & processor.isVerifyLocation == true) {
                upload(blob, DISTANCE_VERIFICATION_MODE, 'laptop_distance.wav').then(function (response) {
                    console.log(response)
                }).catch(function (error) {
                    console.log('Something went wrong', error);
                    processor.disconnect();
                    processor.onaudioprocess = null;
                });

                processor.disconnect();
                processor.onaudioprocess = null;
            }

        };

        return processor;
    }
};

function playSound(arr, audioContext) {
    let buf = new Float32Array(arr.length)
    for (let i = 0; i < arr.length; i++) buf[i] = arr[i]
    let buffer = audioContext.createBuffer(1, buf.length, audioContext.sampleRate)
    buffer.copyToChannel(buf, 0)
    let source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(audioContext.currentTime + 0.6);
}

function volumeAudioProcess(event) {
    if (this.notableSignalArr.length >= 133120) {
        //approx 3 seconds of recording
        this.shutdown();
        return null;
    }

    let buf = event.inputBuffer.getChannelData(0);
    // let bufLength = buf.length;
    // let sum = 0;
    // let x;
    let mergedArr = void 0;

    // // Do a root-mean-square on the samples: sum up the squares...
    // for (let i = 0; i < 10; i++) {
    //     x = buf[i];
    //     if (Math.abs(x) >= this.clipLevel) {
    //         this.clipping = true;
    //         this.lastClip = window.performance.now();
    //     }
    //     sum += x * x;
    // }
    //
    // // ... then take the square root of the sum.
    // let rms = Math.sqrt(sum / bufLength);
    //
    // // Now smooth this out with the averaging factor applied
    // // to the previous sample - take the max here because we
    // // want "fast attack, slow release."
    // this.volume = Math.max(rms, this.volume * this.averaging);

    let bufArr = Float32Array.from(buf);
    // if (this.isRecording == true) { // recording has already started
    //     mergedArr = mergeAudioBuf(this.notableSignalArr, bufArr);
    //     this.notableSignalArr = mergedArr;
    // } else if ((this.volume * 100) > 1 && this.isRecording == false) { //silence broken, initiate recording
    mergedArr = mergeAudioBuf(this.notableSignalArr, bufArr);
    this.notableSignalArr = mergedArr;
    this.isRecording = true;
    // }
}

function mergeAudioBuf(buf1, buf2) {
    let mergedArr = new Float32Array(buf1.length + buf2.length);
    mergedArr.set(buf1);
    mergedArr.set(buf2, buf1.length);
    return mergedArr;
}

let upload = function (blob, mode, filename) {
    let request = new XMLHttpRequest();
    return new Promise(function (resolve, reject) {
        // Setup listener to process completed requests
        request.onload = function (response) {

            // Only run if the request is complete
            if (request.readyState !== 4) return;

            // Process the response
            if (request.status >= 200 && request.status < 300) {
                // If successful
                let jsonResponse = JSON.parse(response.target.responseText);
                resolve(jsonResponse);
            } else {
                // If failed
                reject({
                    status: request.status,
                    statusText: request.statusText
                });
            }
        };

        let fd = new FormData();
        fd.append('file', blob, filename);
        fd.append('mode', mode);
        let serverUrl = config.apiUrl + '/api/upload';
        request.open("POST", serverUrl, true);
        request.send(fd);
    });
};
