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
var toWav = require('audiobuffer-to-wav');

module.exports = {
    createAudioMeter: function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
        var processor = audioContext.createScriptProcessor(1024);
        var notableSignalArr = new Float32Array();
        var isRecording = false;

        processor.onaudioprocess = volumeAudioProcess;
        processor.clipping = false;
        processor.lastClip = 0;
        processor.volume = 0;
        processor.clipLevel = clipLevel || 0.98;
        processor.averaging = averaging || 0.95;
        processor.clipLag = clipLag || 750;
        processor.notableSignalArr = notableSignalArr;
        processor.isRecording = isRecording;

        // this will have no effect, since we don't copy the input to the output,
        // but works around a current Chrome bug.
        processor.connect(audioContext.destination);

        processor.checkClipping = function () {
            if (!this.clipping) return false;
            if (this.lastClip + this.clipLag < window.performance.now()) this.clipping = false;
            return this.clipping;
        };

        processor.shutdown = function () {
            this.disconnect();
            this.onaudioprocess = null;
            var src = audioContext.createBufferSource();

            var audioBuf = audioContext.createBuffer(1, this.notableSignalArr.length, audioContext.sampleRate);
            audioBuf.getChannelData(0).set(this.notableSignalArr);
            src.buffer = audioBuf;
            var wav = toWav(audioBuf);

            var anchor = document.createElement('a');
            document.body.appendChild(anchor);
            anchor.style = 'display: none';
            var blob = new window.Blob([new DataView(wav)], {
                type: 'audio/wav'
            });

            var url = window.URL.createObjectURL(blob);
            anchor.href = url;
            anchor.download = 'audio.wav';
            anchor.click();
            window.URL.revokeObjectURL(url);
        };

        return processor;
    }
};

function volumeAudioProcess(event, notableSignalArr) {

    if (this.notableSignalArr.length == 133120) {
        //approx 3 minutes of recording
        this.shutdown();
        return;
    }

    var buf = event.inputBuffer.getChannelData(0);
    var bufLength = buf.length;
    var sum = 0;
    var x;
    var mergedArr;

    // Do a root-mean-square on the samples: sum up the squares...
    for (var i = 0; i < 10; i++) {
        x = buf[i];
        if (Math.abs(x) >= this.clipLevel) {
            this.clipping = true;
            this.lastClip = window.performance.now();
        }
        sum += x * x;
    }

    // ... then take the square root of the sum.
    var rms = Math.sqrt(sum / bufLength);

    // Now smooth this out with the averaging factor applied
    // to the previous sample - take the max here because we
    // want "fast attack, slow release."
    this.volume = Math.max(rms, this.volume * this.averaging);

    var bufArr = Float32Array.from(buf);
    if (this.isRecording == true) {
        // recording has already started
        mergedArr = mergeAudioBuf(this.notableSignalArr, bufArr);
        this.notableSignalArr = mergedArr;
    } else if (this.volume * 100 > 1 && this.isRecording == false) {
        //silence broken, initiate recording
        mergedArr = mergeAudioBuf(this.notableSignalArr, bufArr);
        this.notableSignalArr = mergedArr;
        this.isRecording = true;
    }
}

function mergeAudioBuf(buf1, buf2) {
    var mergedArr = new Float32Array(buf1.length + buf2.length);
    mergedArr.set(buf1);
    mergedArr.set(buf2, buf1.length);
    return mergedArr;
}